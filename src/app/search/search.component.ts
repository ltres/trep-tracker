import{ Component, ElementRef, ViewChild }from'@angular/core';
import{ BoardService }from'../../service/board.service';

@Component( {
  selector: 'search',

  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
} )
export class SearchComponent{
  @ViewChild( 'input' ) searchInput!: ElementRef;
  searchPhrase: string = "";
  matchNumber: number = 0;
  highlightColor= 'yellow';
  private debounce: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private boardService: BoardService,
    private el: ElementRef,
  ){
    this.boardService.focusSearch$.subscribe( fs => {
      if( fs ){
        this.focusInput( true );
        this.highlightText();       
      }
    } );
  }

  change(){
    if( this.debounce ){
      clearTimeout( this.debounce );
    }
    this.debounce = setTimeout( () => {
      this.highlightText();
    },250 );

  }

  private highlightText(){
    this.matchNumber = 0
    this.removeHighlights();
    if( this.searchPhrase.length === 0 ){
      return;
    }
    this.boardService.parents?.forEach( p => {
      // remove all HTML
      p.searchTextContent = p.textContent.replace( /<[^>]*>/g, '' );
      p.searchTextContent = p.searchTextContent.replace( /\u00A0/g, ' ' ); //nbsp
      const curSearchContent = p.searchTextContent;
      p.searchTextContent = p.searchTextContent.replaceAll( new RegExp( this.searchPhrase!,'ig' ), `<span class="search-highlight">${this.searchPhrase}</span>` );
      if( curSearchContent.length !== p.searchTextContent.length ){
        this.matchNumber ++;
      }
    } )
    this.boardService.publishBoardUpdate()
  }

  private removeHighlights(){
    this.boardService.parents?.forEach( p => {
      delete p.searchTextContent
    } )
  }

  onFocus(){
    this.highlightText();
  }

  onBlur(){
    this.removeHighlights();
    this.boardService.blurSearch();
    this.boardService.publishBoardUpdate();
  }

  private focusInput( selectAll: boolean ){
    const input = this.searchInput.nativeElement;
    // input.click();
    input.focus();
    input.setSelectionRange( selectAll ? 0 : input.value.length, input.value.length );
  }

}
