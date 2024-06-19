import { Injectable } from "@angular/core";
import { Board, Lane, Container, Task, Tag } from "../types/task";
import { BehaviorSubject, Observable, map } from "rxjs";
import { generateUUID } from "../utils/utils";
import { BoardService } from "./board.service";

@Injectable({
    providedIn: 'root'
})
export class TagService {
    private _tags$: BehaviorSubject<Tag[]> = new BehaviorSubject<Tag[]>([]);

    constructor(private boardService: BoardService) {
        this.boardService.parents$.subscribe(parents => {
            let tags:Tag[] = parents?.filter( p => !this.boardService.isLane(p) || (this.boardService.isLane(p) && p.tags.length === 0) ) //exclude static lanes
            .reduce((acc, parent) => { return acc.concat(parent.tags ?? []) }, [] as Tag[]) ?? [];
            this._tags$.next(tags.map(t => ({ tag: t.tag.toLowerCase() })));
        });
    }

    get tags$(): Observable<Tag[]> {
        return this._tags$;
    }

    get uniqueTagsAndNumerosity$(): Observable<{tag: string, numerosity: number}[]> {
        return this._tags$.pipe(
            map(tags => {
                let tagMap = new Map<string, number>();
                tags.forEach(t => {
                    let count = tagMap.get(t.tag) ?? 0;
                    tagMap.set(t.tag, count + 1);
                });
                return Array.from(tagMap.entries()).map(([tag, numerosity]) => ({tag, numerosity})).sort((a, b) => b.numerosity - a.numerosity);
            })
        );
    }

    /**
     * Updates the tags of a container data model.
     */
    extractAndUpdateTags(container: Container<any>) {
        let value = container.textContent;
        value = value.replace(/^[\n\s]+/, '');
        value = value.replace(/[\n\s]+$/, '');
        
        // Tags wrappig
        value = value.replace(/(<span tag="true" class="tag">)?(@[^\s\u00A0\u202F<]+)(<\/span>)?/g, '<span tag="true" class="tag">$2</span>');

        // Tags extraction
        const regex = /<span tag="true" class="tag">([^<]+)<\/span>/g;
        const tags = [];
        let match;
        while ((match = regex.exec(value)) !== null) {
            tags.push(match[1]);
        }

        // Cleanup
        value = value.replace(/<span tag="true" class="tag"><\/span>/g,"");
        container.textContent = value;
        let currentTags = container.tags ?? [];
        let newTags = tags.map(t => ({tag: t}));
        let tagsToAdd = newTags.filter(t => !currentTags?.find(ct => ct.tag === t.tag));
        let tagsToRemove = currentTags?.filter(ct => !newTags.find(t => t.tag === ct.tag));
        container.tags = newTags;

        if( tagsToAdd.length > 0 || tagsToRemove.length > 0 ){
            this.boardService.publishBoardUpdate();
        }
    }

}
