import { Injectable } from "@angular/core";
import { Board, DragEventCoordinates, Lane, Task } from "../types/task";
import { BehaviorSubject, Observable, map } from "rxjs";
import { generateUUID } from "../utils/utils";

@Injectable({
    providedIn: 'root'
})
export class DragService {
    private _dragEvent$: BehaviorSubject<{ task: Task, dragCoordinates: DragEventCoordinates } | undefined> = new BehaviorSubject<{ task: Task, dragCoordinates: DragEventCoordinates } | undefined>(undefined);

    publishDragEvent(task: Task, dragCoordinates: DragEventCoordinates) {
        //this.setActiveTask(task);
        this._dragEvent$.next({ task, dragCoordinates });
    }

    get dragEvent$(): Observable<{ task: Task, dragCoordinates: DragEventCoordinates } | undefined> {
        return this._dragEvent$;
    }

}