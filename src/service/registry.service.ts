
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ContainerComponent } from '../app/base/base.component';
import { cursorIsInside } from '../utils/utils';

/**
 * Service responsible for managing the registry of draggable and base components.
 */
@Injectable({
  providedIn: 'root',
})
export class ContainerComponentRegistryService {
  private _componentRegistry$: BehaviorSubject<ContainerComponent[]> = new BehaviorSubject<ContainerComponent[]>([]);

  componentInitialized(component: ContainerComponent) {
    this.addToRegistry(this._componentRegistry$, component);
  }

  componentDestroyed(component: ContainerComponent) {
    this.removeFromRegistry(this._componentRegistry$, component);
  }

  public getComponentsAtCoordinates(x:number, y:number): ContainerComponent[]{
    const comps = this._componentRegistry$.getValue();
    const overlappedComponent = comps
      .sort((a, b) => {
        const typeOrder:{[key:string]: number} = { task: 1, lane: 2, board: 3 };
        return (typeOrder[a.container._type] ?? 4) - (typeOrder[b.container._type] ?? 4);
      })
      .filter(mayBeOverlapped => {
        // overlapped element's html may contain a data-consider-for-overlapping-checks attribute.
        // If it does, consider it for overlapping checks
        const overlappedConsiderForOverlappingChecks: HTMLElement = mayBeOverlapped.el.nativeElement.querySelector('[data-consider-for-overlapping-checks]') || mayBeOverlapped.el.nativeElement;
        //let draggedConsiderForOverlappingChecks: HTMLElement = draggedComponent.el.nativeElement.querySelector("[data-consider-for-overlapping-checks]")|| mayBeOverlapped.el.nativeElement;

        return cursorIsInside(x,y, overlappedConsiderForOverlappingChecks.getBoundingClientRect());
      });
    return overlappedComponent
  }

  private removeFromRegistry<T extends ContainerComponent>(registry: BehaviorSubject<T[]>, component: T) {
    const curVal = registry.getValue();
    const index = curVal.findIndex(c => c === component);
    if (index === -1) {
      console.warn('Component not found in registry');
      return;
    }
    curVal.splice(index, 1);
    registry.next(curVal);
  }

  private addToRegistry<T extends ContainerComponent>(registry: BehaviorSubject<T[]>, component: T) {
    const curVal = registry.getValue();
    if (curVal.find(c => c === component)) {
      console.warn('Component already in registry');
      return;
    }
    curVal.push(component);
    registry.next(curVal);
  }

  get componentRegistry(): ContainerComponent[] {
    return this._componentRegistry$.getValue();
  }

}
