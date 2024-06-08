import { Injectable } from "@angular/core";
import { Board, DragEventCoordinates, Lane, Container, Task } from "../types/task";
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
    private _allParents$: BehaviorSubject<Container[] | undefined> = new BehaviorSubject<Container[] | undefined>(undefined);

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

        this._boards$.subscribe(b => {
            let allTasks: Task[] = [];
            let allLanes: Lane[] = [];
            b.forEach(board => {
                board.children.forEach(lane => {

                    allTasks = allTasks.concat(lane.children);
                    lane.children.forEach(task => {
                        allTasks = allTasks.concat(this.getDescendants(task).filter(t => this.isTask(t)) as Task[]);
                    })


                })
                // remove lanes without children
                board.children = board.children.filter(l => l.children.length > 0);

                allLanes = allLanes.concat(board.children);
            })
            this._allTasks$.next(allTasks);
            this._allLanes$.next(allLanes);
            this._allParents$.next([...allTasks, ...allLanes]);
        })
    }

    getDescendants(container: Container): Container[] {
        let descendants: Container[] = [];
        for (let child of container.children) {
            descendants = descendants.concat(child).concat(this.getDescendants(child));
        }

        return descendants
    }

    addBoard(board: Board) {
        this._boards$.next([...this._boards$.getValue(), board]);
    }

    getLanes$(board: Board): Observable<Lane[]> {
        return this._boards$.pipe(
            map(boards => boards.find(b => b.id === board.id)?.children || [])
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
                let b = boards.find(board => board.children.find(l => l.id === lane.id))

                return b?.children.find(l => l.id === lane.id)!;
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



    selectTask(lane: Lane, task: Task, method: 'mouse' | 'keyboard') {
        let cur = this._selectedTasks$.getValue() || [];
        if (method === 'mouse') {
            if (cur?.find(t => t.id === task.id)) {
                cur = cur.filter(t => t.id !== task.id);
            } else {
                cur?.push(task);
            }
        } else {
            cur.find(t => t.id === task.id) ? cur = cur : cur = cur.concat(task);
        }
        this._lastSelectedTask$.next(task);
        this._selectedTasks$.next(cur);
        this._lastSelectedLane$.next(lane);
        // console.log('selectTask', this._selectedTasks$.getValue())
    }

    clearSelectedTasks() {
        this._selectedTasks$.next([]);
        this._lastSelectedLane$.next(undefined);
    }

    get selectedTasks$(): Observable<Task[] | undefined> {
        return this._selectedTasks$;
    }
    get lastSelectedTask$(): Observable<Task | undefined> {
        return this._lastSelectedTask$;
    }
    get lastSelectedLane$(): Observable<Lane | undefined> {
        return this._lastSelectedLane$;
    }
    get boards$(): Observable<Board[]> {
        return this._boards$;
    }
    get parents$(): Observable<Container[] | undefined> {
        return this._allParents$;
    }
    get editorActiveTask$(): Observable<Task | undefined> {
        return this._editorActiveTask$;
    }
    get lastSelectedLane(): Lane | undefined {
        return this._lastSelectedLane$.getValue();
    }
    get parents(): Container[] | undefined {
        return this._allParents$.getValue();
    }
    get lastSelectedTask(): Task | undefined {
        return this._lastSelectedTask$.getValue();
    }
    get selectedTasks(): Task[] | undefined {
        return this._selectedTasks$.getValue();
    }
    /**
     * Adds a floating lane to the specified board.
     * The floating lane contains a single task and is positioned at the specified coordinates.
     * If the task already exists in any of the existing lanes, it is removed from those lanes.
     * If a lane becomes empty after removing the task, it is also removed from the board.
     * Finally, the new floating lane is added to the board and the updated boards are emitted.
     */
    addFloatingLane(board: Board, x: number, y: number, children: Task[] | undefined): Lane {
        let boards = this._boards$.getValue();
        let activeBoard = boards.find(b => b.id === board.id);
        if (!activeBoard) {
            throw new Error(`Cannot find board for board ${board.id}`)
        }
        activeBoard.children = activeBoard.children.filter(l => l.children.length > 0);

        let newLane: Lane = {
            id: generateUUID(),
            children: [],
            _type: 'lane',
            coordinates: {
                x,
                y
            }
        }
        activeBoard.children.push(newLane);

        if (children) {
            this.addAsChild(newLane, children);
        }

        this._boards$.next(boards);

        return newLane;
    }

    toggleTaskStatus(task: Task) {
        let boards = this._boards$.getValue();

        this._allTasks$.getValue()?.forEach(t => {
            if (t.id === task.id) {
                t.status = t.status === 'completed' ? 'todo' : 'completed';
            }
        })

        this._boards$.next(boards);
    }

    getTaskInDirection(lane: Lane, tasks: Task[] | undefined, direction: 'up' | 'down' | 'left' | 'right'): Task | undefined {
        if (!tasks || tasks.length === 0) {
            return;
        }
        // get all the tasks in the lane, including descendants, in an ordered array
        let orderedLinearizedTasks = lane.children.reduce((acc, t) => acc.concat(t).concat(this.getDescendants(t)), [] as Container[]).filter(t => t && this.isTask(t)) as Task[];
        let index = orderedLinearizedTasks.length - 1;
        for (let toCkeck of tasks) {
            let internalIdx = orderedLinearizedTasks.findIndex(t => t.id === toCkeck.id);
            index = internalIdx < index ? internalIdx : index;
        }

        return orderedLinearizedTasks[direction === 'up' ? index - 1 : index + 1];
    }

    findParent(objs: Container[] | undefined): Container | undefined {
        if (!objs || objs.length === 0) {
            return;
        }
        if (this.isLanes(objs)) {

        } else if (this.isTasks(objs)) {
            objs = this.getTopLevelTasks(objs);
        }

        let parents = this._allParents$.getValue()?.filter(p => p.children.length > 0 && p.children.find(c => objs.find(o => o.id === c.id)));

        if (!parents || parents?.length !== 1) {
            console.info('findParent: objs.length !== 1', objs);
            return;
        }
        return parents[0];
    }

    addAsSiblings(parent: Container, sibling: Task | undefined, tasks: Task[] | undefined, position: 'before' | 'after' = 'before') {
        if (!tasks || tasks.length === 0) {
            return;
        }
        let boards = this._boards$.getValue();


        tasks = this.getTopLevelTasks(tasks);

        // remove the task from any parent
        this._allParents$.getValue()?.forEach(p => {
            p.children = p.children.filter(c => !tasks?.find(t => t.id === c.id));
        })


        if (sibling) {
            // find the index of the sibling
            let index = parent.children.findIndex(c => c.id === sibling.id);
            if (index === -1) {
                throw new Error(`Cannot find sibling with id ${sibling.id} in parent with id ${parent.id}`);
            }
            // add the task before or after the sibling
            parent.children.splice(position === 'before' ? index : index + 1, 0, ...tasks);
        } else {
            // add the task at the end of the parent
            parent.children = parent.children.concat(tasks);
        }


        // Publish the changes
        this._boards$.next(boards);

    }

    addAsChild(parent: Container, children: Task[] | undefined) {
        if (!children || children.length === 0) {
            return;
        }
        let boards = this._boards$.getValue();

        // incoming tasks could be related one another. Keep only the top level tasks
        children = this.getTopLevelTasks(children);

        // remove the child from any children set
        this._allParents$.getValue()?.forEach(p => {
            p.children = p.children.filter(c => !children.find(t => t.id === c.id));
        })
        // add the child to the parent, if it is not already there
        children.forEach(child => {
            if (!parent.children.find(c => c.id === child.id)) {
                parent.children.push(child);
            }
        })

        // remove custom coordinates from children
        children.forEach(c => {
            delete c.coordinates;
        })

        // Publish the changes
        this._boards$.next(boards);
    }

    removeChildren(parent: Container, children: Task[] | undefined) {
        if (!children || children.length === 0) {
            return;
        }
        let boards = this._boards$.getValue();

        children = this.getTopLevelTasks(children);

        parent.children = parent.children.filter(c => !children.find(t => t.id === c.id));
        // task need to become sibling of the parent. Find the parent of the parent
        let grandParent = this.findParent([parent]);
        if (grandParent) {
            grandParent.children = grandParent.children.concat(children);
        }

        // Publish the changes
        this._boards$.next(boards);
    }

    isLane(parent: Container | undefined): parent is Lane {
        if (!parent) {
            return false;
        }
        return (parent as Lane)._type === 'lane';
    }
    isTask(parent: Container): parent is Task {
        return (parent as Task)._type === 'task';
    }
    isLanes(parent: Container[]): parent is Lane[] {
        return (parent[0] as Lane)._type === 'lane';
    }
    isTasks(parent: Container[]): parent is Task[] {
        return (parent[0] as Task)._type === 'task';
    }

    // retrieves only the tasks higher in the hierarchy
    getTopLevelTasks(tasks: Task[]): Task[] {
        let ret: Task[] = [...tasks];
        // incoming tasks could be related one another. Keep only the top level tasks
        for (let child of tasks) {
            let descendants = this.getDescendants(child);
            ret = ret.filter(c => descendants.map(d => d.id).indexOf(c.id) === -1);
        }
        return ret;
    }

    hasNextSibling(board: Board, task: Task): boolean {
        let has: boolean = false;
        this._allParents$.getValue()?.forEach(p => {
            let index = p.children.findIndex(c => c.id === task.id);
            if (index !== -1 && index < p.children.length - 1) {
                has = true;
            }
        })
        return has;
    }

    publishBoardUpdate() {
        this._boards$.next(this._boards$.getValue());
    }

}
