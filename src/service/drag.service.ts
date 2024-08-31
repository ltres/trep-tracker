import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {  getDescendants} from '../utils/utils';
import { BoardService } from './board.service';
import { ContainerComponentRegistryService } from './registry.service';
import { ContainerComponent } from '../app/base/base.component';
import { Board, Container } from '../types/types';
import { isTask, isLane } from '../utils/guards';

@Injectable({
  providedIn: 'root',
})
export class DragService {
  private _dragEndEvent$: BehaviorSubject<{
        dragged: Container,
        component: ContainerComponent,
        event: DragEvent,
        deltaX: number,
        deltaY: number,
        board: Board
    } | undefined>
    = new BehaviorSubject<{
        dragged: Container,
        component: ContainerComponent,
        event: DragEvent,
        deltaX: number,
        deltaY: number,
        board: Board  } | undefined>(undefined);

  constructor(
        private boardService: BoardService,
        private registryService: ContainerComponentRegistryService,
  ) {
    this._dragEndEvent$.subscribe(event => {
      if (!event) {
        return;
      }
      console.info('Drag end event', event);
      const draggedObject = event.dragged;
      const board = event.board;
      if (!draggedObject || !board) {
        console.warn('Dragged component has no object');
        return;
      }
      const {clientX:x, clientY:y } = event.event

      if(isTask(draggedObject) || isLane(draggedObject)){
        // look for overlapped component in the registry
        const overlappedDroppable = this.registryService.getDroppablessAtCoordinates(x,y).filter( c => c.container !== draggedObject);
        if (!overlappedDroppable || overlappedDroppable.length === 0) {
          console.warn('No overlapped droppable found');
          return;
        } else {
          // Overlap case:
          // we have a collection of overlapped components, sort them task first and take the first one

          const { container: overlappedObject } = overlappedDroppable[0];
          if (!overlappedObject) {
            console.warn('Overlapped component has no object');
            return;
          }
          // exclude the possibility that parents get dragged into children
          const anyMatch = getDescendants(draggedObject).filter(descendant => descendant.id === overlappedObject.id && descendant._type === overlappedObject._type).length > 0;
          if (anyMatch) {
            console.warn('Dragged object is a descendant of the overlapped object');
            return;
          }

          if( overlappedObject.id === draggedObject.id && overlappedObject._type === draggedObject._type) {
            throw new Error('Dragged object and overlapped object are the same');
          }
          // execute on first of stack
          overlappedDroppable[0].executeOnDropReceived(draggedObject, event.event);
        }
      }else{
        console.warn("Dragging of this kind of object is not currently managed")
      }
      
    });
  }

  publishDragEvent(dragged: Container, component: ContainerComponent, event: DragEvent, deltaX: number, deltaY: number, board: Board ) {
    this._dragEndEvent$.next({ dragged, component, event, deltaX, deltaY, board });
  }

  get dragEndEvent$(): Observable<{ dragged: Container, event: DragEvent } | undefined> {
    return this._dragEndEvent$;
  }
}
