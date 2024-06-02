import { Injectable } from "@angular/core";
import { Board, Lane, Task } from "../types/task";
import { BehaviorSubject, Observable, map } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class BoardService {

    private _boards$: BehaviorSubject<Board[]> = new BehaviorSubject<Board[]>([]);
    //private _lanes$: BehaviorSubject<Lane[]> = new BehaviorSubject<Lane[]>([]);
    private _tasks$: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);
    private _activeTask$: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);

    get boards$(): Observable<Board[]> {
        return this._boards$;
    }

    addBoard(board:Board) {
        this._boards$.next([...this._boards$.getValue(), board]);
    }

    getLanes$(board: Board): Observable<Lane[]> {
        return this._boards$.pipe(
            map(boards => boards.find(b => b.id === board.id)?.lanes || [])
        );
    }

    getTasks$(lane: Lane): Observable<Task[]> {
        return this._boards$.pipe(
            map(boards => {
                const targetBoard = boards.find(b => b.lanes.find(l => l.id === lane.id));
                if (!targetBoard) {
                    throw new Error(`Cannot find board for lane ${lane.id}`);
                }
                const targetLane = targetBoard.lanes.find(l => l.id === lane.id);
                return targetLane ? targetLane.tasks : [];
            })
        );
    }

    get tasks$(): Observable<Task[]> {
        return this._tasks$;
    }

    addTask(lane: Lane, task: Task) {
        let boards = this._boards$.getValue();
        let active = boards.find( b => b.lanes.find( l => l.id === lane.id ));
        if(!active){
            throw new Error(`Cannot find board for lane ${lane.id}`)
        }
        active.lanes.find( l => l.id === lane.id )!.tasks.push(task);
        this._boards$.next(boards);
    }

    get activeTask$(): Observable<Task | undefined> {
        return this._activeTask$;
    }

    set activeTask(task: Task) {
        this._activeTask$.next(task);
    }

}