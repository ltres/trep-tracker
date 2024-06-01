import { Injectable } from "@angular/core";
import { Task } from "../types/task";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
  })
export class TaskService {


    private _tasks: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);
    private _activeTask: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);

    get tasks$(): Observable<Task[]> {
        return this._tasks;
    }

    addTask(task: Task) {
        this._tasks.next([...this._tasks.getValue(), task]);
    }

    get activeTask$(): Observable<Task | undefined> {
        return this._activeTask;
    }

    set activeTask(task: Task) {
        this._activeTask.next(task);
    }

}