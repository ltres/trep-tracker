import { Injectable } from "@angular/core";
import { Board, Lane, Container, Task, Tag, tagIdentifiers, tagHtmlWrapper, tagCapturingGroup, addTagsForDoneAndArchived } from "../types/types";
import { BehaviorSubject, Observable, filter, map, of } from "rxjs";
import { generateUUID, isStatic } from "../utils/utils";
import { BoardService } from "./board.service";

@Injectable({
    providedIn: 'root'
})
export class TagService {
    private _tags$: BehaviorSubject<{board:Board, tags: Tag[]}[]> = new BehaviorSubject<{board:Board, tags: Tag[]}[]>([]);

    constructor(private boardService: BoardService) {
        this.boardService.boards$.subscribe(boards => {
            this._tags$.next([]);
            for( const board of boards ){
                let tags: Tag[] = board.tags ?? [];
                this.boardService.getDescendants(board).forEach( container => {
                    if( this.boardService.isLane(container) && !isStatic(container) ){
                        return;
                    }
                    tags = tags.concat( container.tags ?? [] );
                });
                // Lowercase all tags and remove duplicates
                tags = tags.map(t => ( { tag: t.tag.toLowerCase(), type: t.type } ) ).reduce( (acc,tag) => {
                    if( acc.map( t => t.tag ).indexOf(tag.tag) < 0 ){
                        // unique tag
                        return acc.concat(tag);
                    }else{
                        return acc;
                    }
                } , [] as Tag[] )
                this._tags$.next( [...this._tags$.getValue(), {board, tags}] );
            }
        });
    }

    get uniqueTagsAndNumerosity$(): Observable<{tag: string, numerosity: number}[]> {
        return of([{tag: "TODO", numerosity: 1}]);
        /*
        return this._tags$.pipe(
            map(tags => {
                let tagMap = new Map<string, number>();
                tags.forEach(t => {
                    let count = tagMap.get(t.tag) ?? 0;
                    tagMap.set(t.tag, count + 1);
                });
                return Array.from(tagMap.entries()).map(([tag, numerosity]) => ({tag, numerosity})).sort((a, b) => b.numerosity - a.numerosity);
            })
        );*/
    }
        /**
     * Updates the tags of a container data model.
     */
        extractTags(extractFrom: string, board: Board): { taggedString: string, tags: Tag[], caretShift: number } {
            let extracted = 0;
            let value = extractFrom;
            //value = value.replace(/^[\n\s]+/, '');
            //value = value.replace(/[\n\s]+$/, '');
            value = value.replaceAll("&nbsp;<", '<'); // "a <span tag="true" class="tag-orange">@l&nbsp;</span>"
            value = value.replaceAll("&nbsp;", ' ');
    
            const allTags = this._tags$.getValue().find(t => t.board.id === board.id)?.tags ?? [];
    
            const tags: { tag: string, type: string}[] = [];
            for( const tagIdentifier of tagIdentifiers){
                const wrappers = tagHtmlWrapper( tagIdentifier.class );
                const regex = new RegExp(`(${wrappers[0]})?${tagCapturingGroup(tagIdentifier.symbol)}?(${wrappers[1]})?`, 'g');
    
                // step #0 tag unwrapping
                value = value.replace(regex, `${tagIdentifier.symbol}$2`);
            }
            for( const tagIdentifier of tagIdentifiers){
                const wrappers = tagHtmlWrapper( tagIdentifier.class );
                // Step #1 Tags extraction
                let regex = new RegExp(tagCapturingGroup(tagIdentifier.symbol), 'g');           
                let match;
                while ((match = regex.exec(value)) !== null) {
                    tags.push({tag:match[1], type: tagIdentifier.type});
                }
    
                // Step #2 Auto tagging feature. If a word that was previously used as a tag is used as a standard word in the text, automatically make it a tag.
                const words = value.split(/\s+/);
                for( const word of words ){
                    if( allTags.filter( t => t.type === tagIdentifier.type )
                        .map( t => t.tag.toLowerCase() )
                        .indexOf( word.toLowerCase() ) >= 0 
                        && tags.map( t => t.tag.toLowerCase() )
                        .indexOf(word.toLowerCase()) < 0 ){
                        tags.push({tag: word, type: tagIdentifier.type});
                        words.splice( words.indexOf(word), 1, tagIdentifier.symbol + word );
                        // move caret forward one position:
                        // moveCaret(tagIdentifier.symbol.length);
                        extracted++;
                    }
                }
                if( extracted > 0){
                    value = words.join(' ');
                }
    
                // Step #3 Tags wrapping
                value = value.replace(regex, `${wrappers[0]}${tagIdentifier.symbol}$1${wrappers[1]}`);
    
                // Step #4 Cleanup empty wrappers
                regex = new RegExp(`${wrappers[0]}([^${tagIdentifier.symbol}][^<]+)${wrappers[1]}`, 'g');
                value = value.replace(regex,"$1");
                // container.textContent = value;
            }

            return {
                taggedString: value, 
                tags: tags, 
                caretShift: extracted
            };
        }

}
