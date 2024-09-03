
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { cursorDistance } from '../utils/utils';
import { DroppableDirective } from '../app/directive/droppable.directive';

/**
 * Service responsible for managing the registry of droppables.
 */
@Injectable({
  providedIn: 'root',
})
export class ContainerComponentRegistryService {
  private _droppableRegistry$: BehaviorSubject<DroppableDirective[]> = new BehaviorSubject<DroppableDirective[]>([]);

  componentInitialized(component: DroppableDirective) {
    this.addToRegistry(this._droppableRegistry$, component);
  }

  componentDestroyed(component: DroppableDirective) {
    this.removeFromRegistry(this._droppableRegistry$, component);
  }

  public getDroppablessAtCoordinates(x:number, y:number): DroppableDirective[]{
    const comps = this._droppableRegistry$.getValue();
    const overlappedComponent = comps
      .sort((a, b) => {
        return a.droppable - b.droppable;
      })
      .filter(mayBeOverlapped => {
        return cursorDistance(x,y, mayBeOverlapped.el.nativeElement.getBoundingClientRect()) < 0 ;
      });
    return overlappedComponent
  }

  private removeFromRegistry<T extends DroppableDirective>(registry: BehaviorSubject<T[]>, component: T) {
    const curVal = registry.getValue();
    const index = curVal.findIndex(c => c === component);
    if (index === -1) {
      console.warn('Component not found in registry');
      return;
    }
    curVal.splice(index, 1);
    registry.next(curVal);
  }

  private addToRegistry<T extends DroppableDirective>(registry: BehaviorSubject<T[]>, component: T) {
    const curVal = registry.getValue();
    if (curVal.find(c => c === component)) {
      console.warn('Component already in registry');
      return;
    }
    curVal.push(component);
    registry.next(curVal);
  }

  get componentRegistry(): DroppableDirective[] {
    return this._droppableRegistry$.getValue();
  }

}
