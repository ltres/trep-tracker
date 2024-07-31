
import { Injectable } from "@angular/core";
import { BehaviorSubject, } from "rxjs";
import { ContainerComponent } from "../app/base/base.component";
import { DraggableDirective } from "../app/directive/draggable.directive";

/**
 * Service responsible for managing the registry of draggable and base components.
 */
@Injectable({
    providedIn: 'root'
})
export class ContainerComponentRegistryService {
    private _componentRegistry$: BehaviorSubject<ContainerComponent[]> = new BehaviorSubject<ContainerComponent[]>([]);

    componentInitialized(component: ContainerComponent) {
        this.addToRegistry(this._componentRegistry$, component);
    }

    componentDestroyed(component: ContainerComponent) {
        this.removeFromRegistry(this._componentRegistry$, component);
    }

    private removeFromRegistry<T extends ContainerComponent>(registry: BehaviorSubject<T[]>, component: T) {
        const curVal = registry.getValue();
        const index = curVal.findIndex(c => c === component);
        if (index === -1) {
            console.warn("Component not found in registry");
            return;
        }
        curVal.splice(index, 1);
        registry.next(curVal);
    }

    private addToRegistry<T extends ContainerComponent>(registry: BehaviorSubject<T[]>, component: T) {
        const curVal = registry.getValue();
        if (curVal.find(c => c === component)) {
            console.warn("Component already in registry");
            return;
        }
        curVal.push(component);
        registry.next(curVal);
    }

    get componentRegistry(): ContainerComponent[] {
        return this._componentRegistry$.getValue();
    }

}