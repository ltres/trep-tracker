import { Injectable } from "@angular/core";
import { Board, DragEventCoordinates, Lane, Container, Task } from "../types/task";
import { BehaviorSubject, Observable, Subject, map } from "rxjs";
import { cursorIsInside, generateUUID, overlaps } from "../utils/utils";
import { BoardService } from "./board.service";
import { DraggableComponent } from "../app/draggable/draggable.component";

@Injectable({
    providedIn: 'root'
})
export class DragService {

    private _dragEndEvent$: BehaviorSubject<{ draggedComponent: DraggableComponent, event: DragEvent } | undefined> = new BehaviorSubject<{ draggedComponent: DraggableComponent, event: DragEvent } | undefined>(undefined);
    private _draggableComponentRegistry$: BehaviorSubject<DraggableComponent[]> = new BehaviorSubject<DraggableComponent[]>([]);


    constructor(private boardService: BoardService) {
        this._dragEndEvent$.subscribe(event => {
            if (!event) {
                return;
            }
            console.info("Drag end event", event);
            let { draggedComponent } = event;
            let { object: draggedObject } = draggedComponent;
            let { board } = draggedComponent;
            if (!draggedObject || !board) {
                console.warn("Dragged component has no object");
                return;
            }
            if (!this.boardService.isTask(draggedObject)) {
                console.info("Lane is being dragged, skip checks");
                return
            }
            // look for overlapped component in the registry
            let registry = this._draggableComponentRegistry$.getValue();
            let overlappedComponent = registry.filter(mayBeOverlapped => {
                if(mayBeOverlapped === draggedComponent) return false;
                
                // overlapped element's html may contain a data-consider-for-overlapping-checks attribute. 
                // If it does, consider it for overlapping checks
                let overlappedConsiderForOverlappingChecks: HTMLElement = mayBeOverlapped.el.nativeElement.querySelector("[data-consider-for-overlapping-checks]")|| mayBeOverlapped.el.nativeElement;
                //let draggedConsiderForOverlappingChecks: HTMLElement = draggedComponent.el.nativeElement.querySelector("[data-consider-for-overlapping-checks]")|| mayBeOverlapped.el.nativeElement;

                return cursorIsInside(event.event, overlappedConsiderForOverlappingChecks.getBoundingClientRect())});
            if (!overlappedComponent || overlappedComponent.length === 0) {
                // NO Overlap case:
                this.boardService.addFloatingLane(board, event.event.clientX, event.event.clientY, [draggedObject]);
                console.info("No overlapped component found");
                return;
            } else {
                // Overlap case:
                // we have a collection of overlapped components, sort them task first and take the first one
                overlappedComponent = overlappedComponent.sort((a, b) => {
                    if (this.boardService.isTask(a.object) && !this.boardService.isTask(b.object)) {
                        return -1;
                    }
                    if (!this.boardService.isTask(a.object) && this.boardService.isTask(b.object)) {
                        return 1;
                    }
                    return 0;
                }); 
 
                let { object: overlappedObject } = overlappedComponent[0];
                if (!overlappedObject) {
                    console.info("Overlapped component has no object");
                    return;
                }
                // exclude the possibility that parents get dragged into children
                let anyMatch = this.boardService.getDescendants(draggedObject).filter(descendant => descendant.id === overlappedObject.id && descendant._type === overlappedObject._type).length > 0;
                if (anyMatch) {
                    console.warn("Dragged object is a descendant of the overlapped object");
                    return;
                }

                this.boardService.addAsChild(overlappedObject, [draggedObject]);
            }
        });
    }

    publishDragEvent(draggable: DraggableComponent, event: DragEvent) {
        this._dragEndEvent$.next({ draggedComponent: draggable, event });
    }

    addToRegistry(draggable: DraggableComponent) {
        let registry = this._draggableComponentRegistry$.getValue();
        registry.push(draggable);
        this._draggableComponentRegistry$.next(registry);
    }
    removeFromRegistry(draggable: DraggableComponent) {
        let registry = this._draggableComponentRegistry$.getValue();
        let index = registry.findIndex(d => d === draggable);
        if (index === -1) {
            console.warn("Component not found in registry");
            return;
        }
        registry.splice(index, 1);
        this._draggableComponentRegistry$.next(registry);
    }

    get dragEndEvent$(): Observable<{ draggedComponent: DraggableComponent, event: DragEvent } | undefined> {
        return this._dragEndEvent$;
    }
}