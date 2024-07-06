
import { Injectable } from "@angular/core";
import { BehaviorSubject, } from "rxjs";
import { BaseComponent } from "../app/base/base.component";
import { DraggableDirective } from "../app/directive/draggable.directive";

/**
 * Service responsible for managing the registry of draggable and base components.
 */
@Injectable({
    providedIn: 'root'
})
export class RegistryService {
    private _draggableComponentRegistry$: BehaviorSubject<BaseComponent[]> = new BehaviorSubject<BaseComponent[]>([]);
    private _baseComponentRegistry$: BehaviorSubject<BaseComponent[]> = new BehaviorSubject<BaseComponent[]>([]);

    componentInitialized(component: BaseComponent) {
        this.addToRegistry(this._baseComponentRegistry$, component);
        if (this.isDraggableComponent(component)) {
            this.addToRegistry(this._draggableComponentRegistry$, component);
            
        }
        // console.debug("Component added to base component registry" + (this.isDraggableComponent(component) ? " and to draggable registry" : ""), component);
    }

    componentDestroyed(component: BaseComponent) {
        this.removeFromRegistry(this._baseComponentRegistry$, component);
        if (this.isDraggableComponent(component)) {
            this.removeFromRegistry(this._draggableComponentRegistry$, component);
        }
        // console.debug("Component removed from base component registry" + (this.isDraggableComponent(component) ? " and from draggable registry" : ""), component);

    }

    addToDraggableRegistry(draggable: BaseComponent) {
        let registry = this._draggableComponentRegistry$.getValue();
        registry.push(draggable);
        this._draggableComponentRegistry$.next(registry);
    }

    removeFromDraggableRegistry(draggable: BaseComponent) {
        let registry = this._draggableComponentRegistry$.getValue();
        let index = registry.findIndex(d => d === draggable);
        if (index === -1) {
            console.warn("Component not found in registry");
            return;
        }
        registry.splice(index, 1);
        this._draggableComponentRegistry$.next(registry);
    }

    private removeFromRegistry<T extends BaseComponent>(registry: BehaviorSubject<T[]>, component: T) {
        let curVal = registry.getValue();
        let index = curVal.findIndex(c => c === component);
        if (index === -1) {
            console.warn("Component not found in registry");
            return;
        }
        curVal.splice(index, 1);
        registry.next(curVal);
    }

    private isDraggableComponent(component: BaseComponent): component is BaseComponent {
        return (component as BaseComponent).object !== undefined;
    }

    private addToRegistry<T extends BaseComponent>(registry: BehaviorSubject<T[]>, component: T) {
        let curVal = registry.getValue();
        if (curVal.find(c => c === component)) {
            console.warn("Component already in registry");
            return;
        }
        curVal.push(component);
        registry.next(curVal);
    }

    get draggableComponentRegistry(): BaseComponent[] {
        return this._draggableComponentRegistry$.getValue();
    }

    get baseComponentRegistry(): BaseComponent[] {
        return this._baseComponentRegistry$.getValue();
    }

}