import { Injectable } from "@angular/core";
import { Board, DragEventCoordinates, Lane, Task } from "../types/task";
import { BehaviorSubject, Observable, map } from "rxjs";
import { generateUUID } from "../utils/utils";

@Injectable({
    providedIn: 'root'
})
export class BoardService {
    private _boards$: BehaviorSubject<Board[]> = new BehaviorSubject<Board[]>([]);
    private _editorActiveTask$: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);

    private _selectedTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>(undefined);
    private _lastSelectedTask$: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);

    private _lastSelectedLane$: BehaviorSubject<Lane | undefined> = new BehaviorSubject<Lane | undefined>(undefined);

    constructor() {
        let keys = ['_boards$', '_editorActiveTask$', '_selectedTasks$', '_lastSelectedTask$', '_lastSelectedLane$'];
        for(let key of keys){
            let o = JSON.parse(localStorage.getItem(key) || '[]');
            if(o){
                //@ts-ignore
                this[key].next(o);
            }
            //@ts-ignore
            this[key].subscribe( b => {
                localStorage.setItem(key, JSON.stringify(b));
            })
        }
        this._selectedTasks$.subscribe( b => {
            this._lastSelectedTask$.next(b && b.length > 0 ? b[b.length - 1] : undefined);
        });

    }

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

    getTasksCount(){
        return this._boards$.getValue().reduce( (acc, board) => acc + board.lanes.reduce( (acc, lane) => acc + lane.tasks.length, 0), 0);
    }

    getLane$(lane: Lane): Observable<Lane | undefined>{
        return this._boards$.pipe(
            map(boards => { 
                let b = boards.find( board => board.lanes.find( l => l.id === lane.id ) )

                return b?.lanes.find( l => l.id === lane.id )!;
            })
        )
    }

    addTask(lane: Lane, task: Task, order?: {
        task: Task,
        how: "before"|"after"
    }) {
        let boards = this._boards$.getValue();
        let active = boards.find( b => b.lanes.find( l => l.id === lane.id ));
        if(!active){
            throw new Error(`Cannot find board for lane ${lane.id}`)
        }
        
        // Remove the task from all lanes
        boards.forEach( b => b.lanes.forEach( l => {
            const index = l.tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
                l.tasks.splice(index, 1);
            }
            
        }));

        let listToEdit = active.lanes.find( l => l.id === lane.id )!.tasks;
        if(!order){
            listToEdit.push(task);
        }else{
            const index = listToEdit.findIndex(t => t.id === order.task.id);
            if (index !== -1) {
                listToEdit.splice(index + (order.how === 'before' ? 0 : 1), 0, task);
            } else {
                listToEdit.push(task);
            }
        }
        
        active.lanes = active.lanes.filter( l => l.tasks.length > 0 || l.main);

        this._boards$.next(boards);
        //this.setActiveTask(task);
    }

    activateEditorOnTask(lane: Lane, task: Task) {
        if( this._editorActiveTask$.getValue() === task ){
            return
        }
        this._editorActiveTask$.next(task);
        //this._selectedTasks$.next([task]);
        this._lastSelectedLane$.next(lane);
    }

    get editorActiveTask$(): Observable<Task | undefined> {
        return this._editorActiveTask$;
    }

    selectTask(lane: Lane, task: Task) {
        let cur = this._selectedTasks$.getValue() || [];
        if( cur?.find( t => t.id === task.id ) ){
            cur = cur.filter(t => t.id !== task.id);
        }else{
            cur?.push(task);
        }
        this._selectedTasks$.next(cur);
        this._lastSelectedLane$.next(lane);
        console.log('selectTask', this._selectedTasks$.getValue())
    }

    clearSelectedTasks() {
        this._selectedTasks$.next([]);
        this._lastSelectedLane$.next(undefined);
    }

    get selectedTasks$(): Observable<Task[] | undefined> {
        return this._selectedTasks$;
    }
    get selectedTasks(): Task[] | undefined {
        return this._selectedTasks$.getValue();
    }  
    get lastSelectedTask$(): Observable<Task | undefined> {
        return this._lastSelectedTask$;
    }
    get lastSelectedTask(): Task | undefined {
        return this._lastSelectedTask$.getValue();
    }
    get lastSelectedLane$(): Observable<Lane | undefined> {
        return this._lastSelectedLane$;
    }
    get lastSelectedLane(): Lane | undefined {
        return this._lastSelectedLane$.getValue();
    }
    /**
     * Adds a floating lane to the specified board.
     * The floating lane contains a single task and is positioned at the specified coordinates.
     * If the task already exists in any of the existing lanes, it is removed from those lanes.
     * If a lane becomes empty after removing the task, it is also removed from the board.
     * Finally, the new floating lane is added to the board and the updated boards are emitted.
     */
    addFloatingLane(board: Board, task: Task, dragCoordinates: DragEventCoordinates ):Lane {
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

        return newLane;
    }

    toggleTaskStatus(task: Task) {
        let boards = this._boards$.getValue();

        boards.forEach(board => {
            board.lanes.forEach(lane => {
                const targetTask = lane.tasks.find(t => t.id === task.id);
                if (targetTask) {
                    targetTask.status = targetTask.status === 'completed' ? 'todo' : 'completed';
                }
            });
        });

        this._boards$.next(boards);
    }

    getTaskInDirection(lane: Lane, task: Task, direction: 'up' | 'down' | 'left' | 'right'): Task | undefined {
        let tasks = this._boards$.getValue().find(b => b.lanes.find(l => l.id === lane.id))?.lanes.find(l => l.id === lane.id)?.tasks;
        if (!tasks) {
            throw new Error(`Cannot find tasks for lane ${lane.id}`);
        }
        let index = tasks.findIndex(t => t.id === task.id);
        if (index === -1) {
            throw new Error(`Cannot find task ${task.id} in lane ${lane.id}`);
        }

        return tasks[ direction === 'up' ? index - 1 : index + 1];
    }
}
