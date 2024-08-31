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
      const draggedComponent = event.component;
      const { deltaX, deltaY } = event;
      if (!draggedObject || !board) {
        console.warn('Dragged component has no object');
        return;
      }
      const {clientX:x, clientY:y } = event.event

      if(isLane(draggedObject)) {
        if( board.layout === 'absolute' ){
          console.info("Dragged a lane in an absolute layout, nothing to do");
          return;
        }
        return;
      }else if(isTask(draggedObject)){
        // look for overlapped component in the registry
        const overlappedComponent = this.registryService.getComponentsAtCoordinates(x,y).filter( c => c !== draggedComponent );
        if (!overlappedComponent || overlappedComponent.length === 0) {
          // NO Overlap case:
          this.boardService.addFloatingLane(board, event.event.clientX - deltaX + window.scrollX, event.event.clientY - deltaY + window.scrollY, [draggedObject], false);
          console.info('No overlapped component found, adding floating lane');
          return;
        } else {
          // Overlap case:
          // we have a collection of overlapped components, sort them task first and take the first one

          const { container: overlappedObject } = overlappedComponent[0];
          if (!overlappedObject) {
            console.info('Overlapped component has no object');
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

          this.boardService.addAsChild(overlappedObject, [draggedObject]);
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
