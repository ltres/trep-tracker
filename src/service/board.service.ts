import { Injectable } from "@angular/core";
import { Board, DragEventCoordinates, Lane, Task } from "../types/task";
import { BehaviorSubject, Observable, map } from "rxjs";
import { generateUUID } from "../utils/utils";

@Injectable({
    providedIn: 'root'
})
export class BoardService {
    private _boards$: BehaviorSubject<Board[]> = new BehaviorSubject<Board[]>([]);
    //private _lanes$: BehaviorSubject<Lane[]> = new BehaviorSubject<Lane[]>([]);
    //private _tasks$: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);
    //private _activeTask$: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);
    private _dragEvent$: BehaviorSubject<{task: Task, dragCoordinates: DragEventCoordinates} | undefined> = new BehaviorSubject<{task: Task, dragCoordinates: DragEventCoordinates} | undefined>(undefined);

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

    getTasks$(lane: Lane): Observable<Task[] | undefined> {
        return this._boards$.pipe(
            map(boards => {
                const targetBoard = boards.find(b => b.lanes.find(l => l.id === lane.id));
                const targetLane = targetBoard?.lanes.find(l => l.id === lane.id);
                return targetLane ? targetLane.tasks : [];
            })
        );
    }

    getLane$(lane: Lane): Observable<Lane | undefined>{
        return this._boards$.pipe(
            map(boards => { 
                let b = boards.find( board => board.lanes.find( l => l.id === lane.id ) )

                return b?.lanes.find( l => l.id === lane.id )!;
            })
        )
    }

    addTask(lane: Lane, task: Task) {
        let boards = this._boards$.getValue();
        let active = boards.find( b => b.lanes.find( l => l.id === lane.id ));
        if(!active){
            throw new Error(`Cannot find board for lane ${lane.id}`)
        }
        
        // Remove the task from other lanes
        boards.forEach( b => b.lanes.forEach( l => {
            if (l.id !== lane.id) {
                const index = l.tasks.findIndex(t => t.id === task.id);
                if (index !== -1) {
                    l.tasks.splice(index, 1);
                }
            }
        }));

        active.lanes = active.lanes.filter( l => l.tasks.length > 0 || l.main);

        active.lanes.find( l => l.id === lane.id )!.tasks.push(task);
        this._boards$.next(boards);
        this.setActiveTask(task);
    }

    setActiveTask(task: Task) {
        let boards = this._boards$.getValue();
        boards.forEach( b => b.lanes.forEach( l => l.tasks.forEach( t => t.active = t.id === task.id) ))
        this._boards$.next(boards);
    }

    get activeTask$(): Observable<Task | undefined> {
        return this._boards$.pipe(
            map(boards => {
                const activeTask = boards.flatMap(board => board.lanes.flatMap(lane => lane.tasks.find(task => task.active))).filter( t => t);
                return activeTask.length > 0 ? activeTask[0] : undefined;
            })
        );
    }



    /**
     * Adds a floating lane to the specified board.
     * The floating lane contains a single task and is positioned at the specified coordinates.
     * If the task already exists in any of the existing lanes, it is removed from those lanes.
     * If a lane becomes empty after removing the task, it is also removed from the board.
     * Finally, the new floating lane is added to the board and the updated boards are emitted.
     */
    addFloatingLane(board: Board, task: Task, dragCoordinates: DragEventCoordinates ) {
        let boards = this._boards$.getValue();
        let activeBoard = boards.find( b => b.id === board.id);
        if(!activeBoard){
            throw new Error(`Cannot find board for board ${board.id}`)
        }
        
        activeBoard.lanes.forEach(l => {
            const index = l.tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
                l.tasks.splice(index, 1);
            }
        });

        activeBoard.lanes = activeBoard.lanes.filter( l => l.tasks.length > 0 || l.main);

        let newLane: Lane = {
            id: generateUUID(),
            tasks: [task],
            position: 'absolute',
            coordinates: {
                x: dragCoordinates.cursorX - dragCoordinates.deltaX,
                y: dragCoordinates.cursorY - dragCoordinates.deltaY
            }
        }
        activeBoard.lanes.push(newLane);

        this._boards$.next(boards);
    }

    publishDragEvent(task: Task, dragCoordinates: DragEventCoordinates) {
        //console.info(`Drag event published for task ${task.id} at ${x}, ${y}`)
        this._dragEvent$.next({ task, dragCoordinates });
    }

    get dragEvent$(): Observable<{task: Task, dragCoordinates: DragEventCoordinates} | undefined> {
        return this._dragEvent$;
    }
}
