import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
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
  
  private _dragStartEvent$:Subject<Container> = new Subject<Container>();

  constructor(
        private boardService: BoardService,
        private registryService: ContainerComponentRegistryService,
  ) {
    this._dragEndEvent$.subscribe(event => {
      if (!event) {
        return;
      }
      const draggedObject = event.dragged;
      if (!draggedObject) {
        console.warn('Dragged component has no object');
        return;
      }
      const {clientX:x, clientY:y } = event.event

      // look for overlapped component in the registry
      const overlappedDroppable = this.registryService.getDroppablessAtCoordinates(x,y).filter( c => c.container !== draggedObject);
      if (!overlappedDroppable || overlappedDroppable.length === 0) {
        console.warn('No overlapped droppable found');
        return;
      } else {
        // Overlap case:
        // execute on first of stack
        overlappedDroppable[0].executeOnDropReceived(draggedObject, event.event);
      }
      
    });
  }

  publishDragEvent(dragged: Container, component: ContainerComponent, event: DragEvent, deltaX: number, deltaY: number, board: Board ) {
    this._dragEndEvent$.next({ dragged, component, event, deltaX, deltaY, board });
  }
  publishDragStartEvent(dragged: Container) {
    this._dragStartEvent$.next(dragged);
  }

  get dragEndEvent$(): Observable<{ dragged: Container, event: DragEvent } | undefined> {
    return this._dragEndEvent$;
  }

  get dragStartEvent$(): Observable<Container> {
    return this._dragStartEvent$;
  }
}
