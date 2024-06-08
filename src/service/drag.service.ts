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

    private _dragEndEvent$: BehaviorSubject<{ draggedComponent: DraggableComponent, event: DragEvent } | undefined> = new BehaviorSubject<{ draggedComponent: DraggableComponent, event: DragEvent } | undefined>(undefined);
    private _overlapCheckRequest$: Subject<DOMRect | undefined> = new Subject<DOMRect | undefined>();
    private _overlapMatchResponse$: BehaviorSubject<{ parent: Container<any>, component: DraggableComponent } | undefined> = new BehaviorSubject<{ parent: Container, component: DraggableComponent } | undefined>(undefined);

    constructor(private boardService: BoardService) {
        this._dragEndEvent$.subscribe(event => {
            if (!event) {
                return;
            }
            console.log("Drag end event", event);
            let { clientX: x, clientY: y } = event?.event;
            let { draggedComponent: draggedElement } = event;
            let allDraggables = this.boardService.parents;
            if (!allDraggables) return;
            this._overlapCheckRequest$.next(draggedElement.el.nativeElement.getBoundingClientRect());
        

        });
    }

    publishDragEvent(draggable: DraggableComponent, event: DragEvent) {
        this._dragEndEvent$.next({ draggedComponent: draggable, event });
    }
    publishOverlapMatchResponse(parent: Container | undefined, component: DraggableComponent) {
        if(!parent){
            console.warn("Parent is undefined");
            return;
        }
        this._overlapMatchResponse$.next({ parent, component });
    }

    get dragEndEvent$(): Observable<{ draggedComponent: DraggableComponent, event: DragEvent } | undefined> {
        return this._dragEndEvent$;
    }

    get overlapCheckRequest$(): Observable<DOMRect | undefined> {
        return this._overlapCheckRequest$;
    }

}