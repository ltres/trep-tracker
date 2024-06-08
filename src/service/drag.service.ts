import { Injectable } from "@angular/core";
import { Board, DragEventCoordinates, Lane, Container, Task } from "../types/task";
import { BehaviorSubject, Observable, Subject, map } from "rxjs";
import { generateUUID } from "../utils/utils";
import { BoardService } from "./board.service";
import { DraggableComponent } from "../app/draggable/draggable.component";

@Injectable({
    providedIn: 'root'
})
export class DragService {

    private _dragEndEvent$: BehaviorSubject<{ draggedElement: Container, event: DragEvent } | undefined> = new BehaviorSubject<{ draggedElement: Container, event: DragEvent } | undefined>(undefined);
    private _overlapCheckRequest$: Subject<DOMRect | undefined> = new Subject<DOMRect | undefined>();
    private _overlapMatchResponse$: BehaviorSubject<{ parent: Container<any>, component: DraggableComponent } | undefined> = new BehaviorSubject<{ parent: Container, component: DraggableComponent } | undefined>(undefined);

    constructor(private boardService: BoardService) {
        this._dragEndEvent$.subscribe(e => {
            if (!e) {
                return;
            }
            let { clientX: x, clientY: y } = e?.event;
            let { draggedElement } = e;
            let allDraggables = this.boardService.parents;
            if (!allDraggables) return;
            // check overlapping with any draggable:
            let overlapping = allDraggables.find(maybeDraggedOver => {
                if (maybeDraggedOver.id === draggedElement.id) {
                    // same element, skip
                    return false;
                }
                /* let rect = maybeDraggedOver.coordinates;
                if (!rect) {
                    return false;
                }
                return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height; */
                return true;
            });


        });
    }

    publishDragEvent(draggable: Container, event: DragEvent) {
        this._dragEndEvent$.next({ draggedElement: draggable, event });
    }
    publishOverlapMatchResponse(parent: Container, component: DraggableComponent) {
        this._overlapMatchResponse$.next({ parent, component });
    }

    get dragEvent$(): Observable<{ draggedElement: Container } | undefined> {
        return this._dragEndEvent$;
    }
    get overlapCheckRequest$(): Observable<DOMRect | undefined> {
        return this._overlapCheckRequest$;
    }

}