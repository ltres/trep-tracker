import { Injectable } from "@angular/core";
import { Board, DragEventCoordinates, Lane, Parent, Task } from "../types/task";
import { BehaviorSubject, Observable, map } from "rxjs";
import { generateUUID } from "../utils/utils";

@Injectable({
    providedIn: 'root'
})
export class BoardService {

    private _boards$: BehaviorSubject<Board[]> = new BehaviorSubject<Board[]>([]);
    private _editorActiveTask$: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);

    private _allLanes$: BehaviorSubject<Lane[] | undefined> = new BehaviorSubject<Lane[] | undefined>(undefined);
    private _allTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>(undefined);
    private _allParents$: BehaviorSubject<Parent[] | undefined> = new BehaviorSubject<Parent[] | undefined>(undefined);

    private _selectedTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>(undefined);
    private _lastSelectedTask$: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);

    private _lastSelectedLane$: BehaviorSubject<Lane | undefined> = new BehaviorSubject<Lane | undefined>(undefined);

    constructor() {
        let keys = ['_boards$', '_editorActiveTask$', '_selectedTasks$', '_lastSelectedTask$', '_lastSelectedLane$', '_allTasks$', '_allLanes$'];
        for (let key of keys) {
            let o = JSON.parse(localStorage.getItem(key) || '[]');
            if (o) {
                //@ts-ignore
                this[key].next(o);
            }
            //@ts-ignore
            this[key].subscribe(b => {
                localStorage.setItem(key, JSON.stringify(b));
            })
        }
        this._selectedTasks$.subscribe(b => {
            this._lastSelectedTask$.next(b && b.length > 0 ? b[b.length - 1] : undefined);
        });
        this._boards$.subscribe(b => {
            let allTasks: Task[] = [];
            let allLanes: Lane[] = [];
            b.forEach(board => {
                board.lanes.forEach(lane => {
                    allTasks = allTasks.concat(lane.children);
                    lane.children.forEach(task => {
                        allTasks = allTasks.concat(this.getDescendants(task));
                    })
                })
                allLanes = allLanes.concat(board.lanes);
            })
            this._allTasks$.next(allTasks);
            this._allLanes$.next(allLanes);
            this._allParents$.next([...allTasks, ...allLanes]);
        })
    }

    getDescendants(task: Task): Task[] {
        let descendants:Task[] = [];
        for(let child of task.children){
            descendants = descendants.concat(child).concat(this.getDescendants(child));
        }

        return descendants
    }

    get boards$(): Observable<Board[]> {
        return this._boards$;
    }

    addBoard(board: Board) {
        this._boards$.next([...this._boards$.getValue(), board]);
    }

    getLanes$(board: Board): Observable<Lane[]> {
        return this._boards$.pipe(
            map(boards => boards.find(b => b.id === board.id)?.lanes || [])
        );
    }

    getTasks$(lane: Lane): Observable<Task[] | undefined> {
        return this._allLanes$.pipe(
            map(lanes => lanes?.find(l => l.id === lane.id)?.children)
        ) 
    }

    getTasksCount() {
        return this._allTasks$.getValue()?.length || 0;
    }

    getLane$(lane: Lane): Observable<Lane | undefined> {
        return this._boards$.pipe(
            map(boards => {
                let b = boards.find(board => board.lanes.find(l => l.id === lane.id))

                return b?.lanes.find(l => l.id === lane.id)!;
            })
        )
    }

    activateEditorOnTask(lane: Lane, task: Task) {
        if (this._editorActiveTask$.getValue() === task) {
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
        if (cur?.find(t => t.id === task.id)) {
            cur = cur.filter(t => t.id !== task.id);
        } else {
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
    addFloatingLane(board: Board,dragCoordinates: DragEventCoordinates): Lane {
        let boards = this._boards$.getValue();
        let activeBoard = boards.find(b => b.id === board.id);
        if (!activeBoard) {
            throw new Error(`Cannot find board for board ${board.id}`)
        }
        activeBoard.lanes = activeBoard.lanes.filter(l => l.children.length > 0);

        let newLane: Lane = {
            id: generateUUID(),
            children: [],
            _type: 'lane',
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
                const targetTask = lane.children.find(t => t.id === task.id);
                if (targetTask) {
                    targetTask.status = targetTask.status === 'completed' ? 'todo' : 'completed';
                }
            });
        });

        this._boards$.next(boards);
    }

    getTaskInDirection(lane: Lane, tasks: Task[] | undefined, direction: 'up' | 'down' | 'left' | 'right'): Task | undefined {
        if(!tasks || tasks.length === 0){
            return;
        }
        // get all the tasks in the lane, including descendants, in an ordered array
        let orderedLinearizedTasks = lane.children.reduce((acc, t) => acc.concat(t).concat(this.getDescendants(t)), [] as Task[]).filter(t => t);
        let index = orderedLinearizedTasks.length - 1;
        for(let toCkeck of tasks){
            let internalIdx = orderedLinearizedTasks.findIndex(t => t.id === toCkeck.id);
            index = internalIdx < index ? internalIdx : index;
        }

        return orderedLinearizedTasks[direction === 'up' ? index - 1 : index + 1];
    }

    findParent(obj: Parent): Parent | undefined{
        return this._allParents$.getValue()?.find(p => p.children.find(c => c.id === obj.id));
    }

    addAsSiblings(parent: Parent, sibling: Task | undefined, tasks: Task[] | undefined, position: 'before' | 'after' = 'before'){
        if(!tasks || tasks.length === 0){
            return;
        }
        let boards = this._boards$.getValue();

        // remove the task from any parent
        this._allParents$.getValue()?.forEach(p => {
            p.children = p.children.filter(c => !tasks.find(t => t.id === c.id));
        })

        if(sibling){
            // find the index of the sibling
            let index = parent.children.findIndex(c => c.id === sibling.id);
            if(index === -1){
                throw new Error(`Cannot find sibling with id ${sibling.id} in parent with id ${parent.id}`);
            }
            // add the task before or after the sibling
            parent.children.splice(position === 'before' ? index : index + 1, 0, ...tasks);
        }else{
            // add the task at the end of the parent
            parent.children = parent.children.concat(tasks);
        }


        // Publish the changes
        this._boards$.next(boards);

    }

    addAsChild(parent: Parent, children: Task[] | undefined){
        if(!children || children.length === 0){
            return;
        }
        let boards = this._boards$.getValue();

        // incoming tasks could be related one another. Keep only the top level tasks
        for(let child of children){
            let descendants = this.getDescendants(child);
            children = children.filter(c => descendants.map(d => d.id).indexOf(c.id) === -1);
        }

        // remove the child from any children set
        this._allParents$.getValue()?.forEach(p => {
            p.children = p.children.filter(c => !children.find(t => t.id === c.id));
        })
        // add the child to the parent, if it is not already there
        children.forEach(child => {
            if(!parent.children.find(c => c.id === child.id)){
                parent.children.push(child);
            }
        })

        // Publish the changes
        this._boards$.next(boards);
    }

    removeChildren(parent: Parent, children: Task[] | undefined){
        if(!children || children.length === 0){
            return;
        }
        let boards = this._boards$.getValue();
        // incoming tasks could be related one another. Keep only the top level tasks
        for(let child of children){
            let descendants = this.getDescendants(child);
            children = children.filter(c => descendants.map(d => d.id).indexOf(c.id) === -1);
        }

        parent.children = parent.children.filter(c => !children.find(t => t.id === c.id));
        // task need to become sibling of the parent. Find the parent of the parent
        let grandParent = this.findParent(parent);
        if(grandParent){
            grandParent.children = grandParent.children.concat(children);
        }

        // Publish the changes
        this._boards$.next(boards);
    }
    isLane(parent: Parent): parent is Lane{
        return (parent as Lane)._type === 'lane';
    }
}
