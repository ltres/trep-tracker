import{ Injectable }from'@angular/core';
import{ BehaviorSubject, map, Observable }from'rxjs';
import{ getDescendants, isArchivedOrDiscarded, isPlaceholder, isStatic }from'../utils/utils';
import{ BoardService }from'./board.service';
import{ Board, Container, Tag, TagType }from'../types/types';
import{ tagIdentifiers, tagHtmlWrapper, tagCapturingGroup }from'../types/constants';
import{ isLane, isTask }from'../utils/guards';

@Injectable( {
  providedIn: 'root',
} )
export class TagService{

  private _tags$: BehaviorSubject<{ board: Board, tags: Tag[] }[]> = new BehaviorSubject<{ board: Board, tags: Tag[] }[]>( [] );
  private _latestEditedTagsContainer: Container | undefined;

  constructor( private boardService: BoardService ){
    // builds the tag repository
    this.boardService.boards$.subscribe( boards => {
      this._tags$.next( [] );
      for( const board of boards ){
        let tags: Tag[] = board.tags ?? [];
        getDescendants( board ).forEach( container => {
          if( isLane( container ) && !isStatic( container ) ){
            return;
          }
          tags = tags.concat( container.tags ?? [] );
        } );
        // Lowercase all tags and remove duplicates
        tags = tags.map( t => ( { tag: t.tag.toLowerCase(), type: t.type } ) ).reduce( ( acc, tag ) => {
          if( acc.map( t => t.tag ).indexOf( tag.tag ) < 0 ){
            // unique tag
            return acc.concat( tag );
          }else{
            return acc;
          }
        }, [] as Tag[] );
        this._tags$.next( [...this._tags$.getValue(), { board, tags }] );
      }
    } );
  }

  getUniqueTagsAndNumerosity$( board: Board, limit: number | undefined ): Observable<{ tag: string, numerosity: number }[]>{
    return this._tags$.pipe(
      map( tags => {
        const tagMap = new Map<string, number>();
        tags.find( t => t.board.id === board.id )?.tags.forEach( t => {
          const count = tagMap.get( t.tag ) ?? 0;
          tagMap.set( t.tag, count + 1 );
        } );
        const ret = Array.from( tagMap.entries() ).map( ( [tag, numerosity] ) => ( {tag, numerosity} ) ).sort( ( a, b ) => b.numerosity - a.numerosity );
        return limit ? ret.splice( 0, limit ) : ret
      } )
    );
  }

  /**
   * Unwraps tags from a string, eg 'unwrap <span class="tag-green">!me</span>' -> 'unwrap !me'
   * @param extractFrom 
   * @returns 
   */
  private unwrap( extractFrom: string ): string{
    for( const tagIdentifier of tagIdentifiers ){
      const wrappers = tagHtmlWrapper( tagIdentifier.class );
      const regex = new RegExp( `(${wrappers[0]})?${tagCapturingGroup( tagIdentifier.symbol )}?(${wrappers[1]})?`, 'g' );
      extractFrom = extractFrom.replace( regex, `${tagIdentifier.symbol}$2` );
    }
    return extractFrom
  }

  /**
   * Wraps tags from a string, eg 'unwrap !me' -> 'unwrap <span class="tag-green">!me</span>'
   * @param extractFrom 
   * @returns 
   */
  private wrap( extractFrom: string ): string{
    for( const tagIdentifier of tagIdentifiers ){
      const wrappers = tagHtmlWrapper( tagIdentifier.class );
      const regex = new RegExp( tagCapturingGroup( tagIdentifier.symbol ), 'g' );
      extractFrom = extractFrom.replace( regex, `${wrappers[0]}${tagIdentifier.symbol}$1${wrappers[1]}` );
    }
    return extractFrom;

  }

  /**
  * Updates the tags of a container data model.
  */
  extractTags( extractFrom: string, board: Board ): { taggedString: string, tags: Tag[], caretShift: number }{
    let extracted = 0;
    let value = extractFrom;
    //value = value.replace(/^[\n\s]+/, '');
    //value = value.replace(/[\n\s]+$/, '');
    value = value.replaceAll( '&nbsp;<', '<' ); // "a <span tag="true" class="tag-orange">@l&nbsp;</span>"
    value = value.replaceAll( '&nbsp;', ' ' );

    const allTags = this._tags$.getValue().find( t => t.board.id === board.id )?.tags ?? [];

    const tags: { tag: string, type: TagType }[] = [];
    // step #0 tag unwrapping
    value = this.unwrap( value );

    for( const tagIdentifier of tagIdentifiers ){
      const wrappers = tagHtmlWrapper( tagIdentifier.class );
      // Step #1 Tags extraction
      let regex = new RegExp( tagCapturingGroup( tagIdentifier.symbol ), 'g' );
      let match;
      while( ( match = regex.exec( value ) ) !== null ){
        tags.push( { tag: match[1], type: tagIdentifier.type } );
      }

      // Step #2 Auto tagging feature. If a word that was previously used as a tag is used as a standard word in the text, automatically make it a tag.
      const words = value.split( /\s+/ );
      for( const word of words ){
        if( allTags.filter( t => t.type === tagIdentifier.type )
          .map( t => t.tag.toLowerCase() )
          .indexOf( word.toLowerCase() ) >= 0
          && tags.map( t => t.tag.toLowerCase() )
            .indexOf( word.toLowerCase() ) < 0 ){
          tags.push( { tag: word, type: tagIdentifier.type } );
          words.splice( words.indexOf( word ), 1, tagIdentifier.symbol + word );
          // move caret forward one position:
          // moveCaret(tagIdentifier.symbol.length);
          extracted++;
        }
      }
      if( extracted > 0 ){
        value = words.join( ' ' );
      }

      // Step #3 Tags wrapping
      value = value.replace( regex, `${wrappers[0]}${tagIdentifier.symbol}$1${wrappers[1]}` );

      // Step #4 Cleanup empty wrappers
      regex = new RegExp( `${wrappers[0]}([^${tagIdentifier.symbol}][^<]+)${wrappers[1]}`, 'g' );
      value = value.replace( regex, '$1' );
      // container.textContent = value;
    }

    return{
      taggedString: value, 
      tags: tags,
      caretShift: extracted,
    };
  }

  /**
   * Tags of the container have a specific tagSymbol. Run through the tags of the board and adjust that symbol, basing on the last user edit.
   * Eg. !tag -> #tag
   * @param container 
   * @param b 
   */
  restructureTags( container: Container, b: Board ){
    const tags = container.tags;
    const boardContainers = getDescendants( b ).filter( d => ( isTask( d ) && !isPlaceholder( d ) && !isArchivedOrDiscarded( d ) ) || !isTask( d )
    );
    for( const tag of tags ){
      for( const toEval of boardContainers ){
        const matchingTag = toEval.tags.find( t => t.tag.toLowerCase() === tag.tag.toLowerCase() );
        if( matchingTag && matchingTag.type !== tag.type ){
          // match, let's verify the symbol
          console.log( `Difference: ${JSON.stringify( matchingTag )}, ${JSON.stringify( tag )}` )
          // Symbol is different. fix the matching tag:
          toEval.textContent = this.unwrap( toEval.textContent );
          const replaceRegex = new RegExp( '.(' + matchingTag.tag + ')' )
          toEval.textContent = toEval.textContent.replace( replaceRegex, ( tagIdentifiers.find( i => i.type === tag.type )?.symbol ?? "" ) + '$1' )
          toEval.textContent = this.wrap( toEval.textContent )

          matchingTag.type = tag.type;

        }
      }
    }
  }

  setLatestEditedTagsContainer( c : Container ){
    this._latestEditedTagsContainer = c;
  }

  get latestEditedTagsContainer(): Container | undefined{
    return this._latestEditedTagsContainer
  }
}
