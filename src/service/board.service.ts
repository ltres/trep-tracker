import {  Inject, Injectable, Injector, NgZone } from "@angular/core";
import { Board, Lane, Container, Task, Tag, tagIdentifiers, getNewBoard, getNewLane, Priority, addTagsForDoneAndArchived, archivedLaneId, Status, ISODateString, StateChangeDate, Layouts, Layout, getLayouts, Statuses, Priorities, getNewTask } from "../types/types";
import { BehaviorSubject, Observable, map } from "rxjs";
import { isPlaceholder, isStatic, setDateSafe } from "../utils/utils";
import { TagService } from "./tag.service";
import { StorageServiceAbstract } from "../types/storage";

@Injectable({
    providedIn: 'root'
})
export class BoardService {
    private _selectedBoard$: BehaviorSubject<Board | undefined> = new BehaviorSubject<Board | undefined>(undefined);

    private _boards$: BehaviorSubject<Board[]> = new BehaviorSubject<Board[]>([]);
    private _editorActiveTask$: BehaviorSubject<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined> = new BehaviorSubject<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined>(undefined);

    private _allLanes$: BehaviorSubject<Lane[] | undefined> = new BehaviorSubject<Lane[] | undefined>(undefined);
    private _allTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>(undefined);
    private _allParents$: BehaviorSubject<Container[] | undefined> = new BehaviorSubject<Container[] | undefined>(undefined);
    //private _allNuked$: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);

    private _selectedTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>(undefined);
    private _lastSelectedTask$: BehaviorSubject<{lane: Lane,task:Task} | undefined> = new BehaviorSubject<{lane: Lane,task:Task} | undefined>(undefined);
    private _focusSearch$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private tagService!: TagService;

    private boardUpdateCounter: number = 0;

    constructor(
        injector: Injector,
        zone: NgZone,
        @Inject('StorageServiceAbstract') private storageService: StorageServiceAbstract
    ) {
        setTimeout(() => this.tagService = injector.get(TagService));

        let latestStatus = this.storageService.getStatus();
        if( latestStatus !== null ){
            this.deserialize(latestStatus);
        }
        this.storageService.getStatusChangeOutsideAppObservable().subscribe(status => {
            if( status !== null ){
                zone.run(() => {
                    this.deserialize(status);
                });
            }else{
                throw new Error(`Cannot read status from storage after change`);
            }
        });

        this._boards$.subscribe(b => {
            console.warn('Boards updated', this.boardUpdateCounter++);
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
                // board.children = board.children.filter(l => l.children.length > 0);

                allLanes = allLanes.concat(board.children);
            })
            this._allTasks$.next(allTasks);
            this._allLanes$.next(allLanes);
            this._allParents$.next([...allTasks, ...allLanes, ...this.boards]);

            // Store status:
            if(storageService.isStatusPresent()){
                this.storageService.writeToStatus({ boards:b });
            }
        })
    }

    /**
     * Retrieves all descendants of a given container.
     * @param container - The container whose descendants are to be retrieved.
     * @returns An array of Container objects representing the descendants.
     */
    getDescendants(container: Container): Container[] {
        let descendants: Container[] = [];
        for (let child of container.children) {
            descendants = descendants.concat(child).concat(this.getDescendants(child));
        }

        return descendants
    }

    addNewBoard() {
        let board = getNewBoard(getNewLane(false))

        this._boards$.next([...this._boards$.getValue(), board]);
    }
    addLane(board: Board) {
        this._boards$.next([...this._boards$.getValue(), board]);
    }

    getLanes$(board: Board, columnNumber?: number): Observable<Lane[]> {
        return this._boards$.pipe(
            map(boards => { 
                let ret : Lane[] = [];
                ret = boards.find(b => b.id === board.id)?.children || [] 
                if(typeof columnNumber !== 'undefined'){
                    ret = ret.filter(l => { 
                        return l.layouts[board.layout].column === columnNumber;
                    }).sort((a, b) => a.layouts[board.layout].order - b.layouts[board.layout].order);
                }
                return ret;
            })
        );
    }

    getTasks$(lane: Lane, priority: Priority | Priority[] | undefined, status: Status | Status[] | undefined, excldeArchived: boolean, sort: keyof StateChangeDate | undefined, sortOrder?: 'asc' | 'desc'): Observable<Task[] | undefined> {
        return this._allLanes$.pipe(
            map(lanes => {
                let res = lanes?.find(l => l.id === lane.id)?.children

                if (priority) {
                    if(Array.isArray(priority)){
                        res = res?.filter(t => priority.includes(t.priority));
                    }else{
                        res = res?.filter(t => t.priority === priority);
                    }
                }
                if (status) {
                    if(Array.isArray(status)){
                        res = res?.filter(t => status.includes(t.status));
                    }else{
                        res = res?.filter(t => t.status === status);
                    }
                }
                if(excldeArchived){
                    // res = res?.filter(t => t.status !== 'archived');
                }

                const regex = /[\-\.\:TZ]/g;
                if (sort) {
                    if (sortOrder === 'desc') {
                        res = res?.sort((b, a) => (Number(a.dates[sort]?.enter?.toString().replace(regex, "")) ?? 0) - (Number(b.dates[sort]?.enter?.toString().replace(regex, "")) ?? 0));
                    } else {
                        res = res?.sort((a, b) => (Number(a.dates[sort]?.enter?.toString().replace(regex, "")) ?? 0) - (Number(b.dates[sort]?.enter?.toString().replace(regex, "")) ?? 0));
                    }
                }
                return res;
            })
        )
    }

    getStaticTasks$(board: Board,tags: Tag[] | undefined, priority: Priority | Priority[] | undefined, status: Status | Status[] | undefined, excldeArchived: boolean, sort: keyof StateChangeDate | undefined, sortOrder?: 'asc' | 'desc'): Observable<Task[] | undefined> {
        return this._boards$.pipe(
            map(boards => { 
                let b = boards.find(b => b.id === board.id);
                if (!b) {
                    throw new Error(`Cannot find board with id ${board.id}`);
                }
                let res = this.getDescendants(b).filter(c => this.isTask(c)) as Task[];

                if (tags) {
                    res = res?.filter(task =>
                        task.tags.filter(t => tags.find(tag => tag.tag.toLowerCase() === t.tag.toLowerCase())).length === tags.length
                    )
                }
                if (priority) {
                    if(Array.isArray(priority)){
                        res = res?.filter(t => priority.includes(t.priority));
                    }else{
                        res = res?.filter(t => t.priority === priority);
                    }
                }
                if (status) {
                    if(Array.isArray(status)){
                        res = res?.filter(t => status.includes(t.status));
                    }else{
                        res = res?.filter(t => t.status === status);
                    }
                }
                if(excldeArchived){
                    res = res?.filter(t => t.status !== 'archived' && !isPlaceholder(t));
                }
                const regex = /[\-\.\:TZ]/g;
                if (sort) {
                    if (sortOrder === 'desc') {
                        res = res?.sort((b, a) => (Number(a.dates[sort]?.enter?.toString().replace(regex, "")) ?? 0) - (Number(b.dates[sort]?.enter?.toString().replace(regex, "")) ?? 0));
                    } else {
                        res = res?.sort((a, b) => (Number(a.dates[sort]?.enter?.toString().replace(regex, "")) ?? 0) - (Number(b.dates[sort]?.enter?.toString().replace(regex, "")) ?? 0));
                    }
                }

                res = res?.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

                return res;
            })
        )
    }

    /**
     * Retrieves non-archived, non-placeholder tasks for the given board.
     * @param board 
     * @returns 
     */
    getTasksForBoard$(board: Board): Observable<Task[]> {
        return this._boards$.pipe(
            map(boards => {
                let b = boards.find(b => b.id === board.id);
                if (!b) {
                    throw new Error(`Cannot find board with id ${board.id}`);
                }
                // get all lanes except the archive and static ones
                let lanes = b.children.filter(l => !l.isArchive && !isStatic(l));
                let tasks: Task[] = [];
                for( let lane of lanes ){
                    let chilren = lane.children;
                    for( let child of chilren ){
                        // get all the descendants of the child except the placeholders and the archived ones, for the given priority
                        tasks = tasks.concat(child).concat( this.getDescendants(child) as Task[]);
                    }
                }
                return tasks.filter(c => !isPlaceholder(c) && c.status !== 'archived');
            })
        
        )
    }

    getTasksCount$(board: Board): Observable<number> {
        return this.getTasksForBoard$(board).pipe(
            map(tasks => tasks.length)
        );
    }
    getTodoCount$(board: Board): Observable<number> {
        return this.getTasksForBoard$(board).pipe(
            map(tasks => tasks.filter(t => t.status === 'todo').length)
        );
    }
    getTasksHavingPriorityCount$(board: Board, priority: Priority): Observable<number> {
        return this.getTasksForBoard$(board).pipe(
            map(tasks => tasks.filter(t => t.priority === priority).length)
        )
    }

    getLane$(lane: Lane): Observable<Lane | undefined> {
        return this._boards$.pipe(
            map(boards => {
                let b = boards.find(board => board.children.find(l => l.id === lane.id))

                return b?.children.find(l => l.id === lane.id)!;
            })
        )
    }

    activateEditorOnTask(lane: Lane, task: Task, caretPosition: number | undefined) {
        if (this._editorActiveTask$.getValue()?.task.id === task.id && this._editorActiveTask$.getValue()?.lane.id === lane.id) {
            return
        }
        this._editorActiveTask$.next({ lane, task, startingCaretPosition: caretPosition });
    }

    toggleTaskSelection(lane: Lane, task: Task) {
        let cur = this._selectedTasks$.getValue() || [];
        if (cur?.find(t => t.id === task.id)) {
            cur = cur.filter(t => t.id !== task.id);
        } else {
            cur?.push(task);
        }
        this._lastSelectedTask$.next({lane,task});
        this._selectedTasks$.next(cur);
    }
    addToSelection(lane: Lane, task: Task) {
        let cur = this._selectedTasks$.getValue() || [];
        if (cur?.find(t => t.id === task.id)) {
            return;
        }
        cur?.push(task);
        this._lastSelectedTask$.next({lane,task});
        this._selectedTasks$.next(cur);
    }
    clearSelectedTasks() {
        this._selectedTasks$.next([]);
    }
    selectFirstBoard() {
        let boards = this._boards$.getValue();
        if (boards.length === 0) {
            return;
        }
        this._selectedBoard$.next(boards[0]);
    }

    get selectedTasks$(): Observable<Task[] | undefined> {
        return this._selectedTasks$;
    }
    get lastSelectedTask$(): Observable<{lane: Lane,task:Task} | undefined> {
        return this._lastSelectedTask$;
    }
    get selectedBoard$(): Observable<Board | undefined> {
        return this._selectedBoard$;
    }
    get boards$(): Observable<Board[]> {
        return this._boards$;
    }
    get parents$(): Observable<Container[] | undefined> {
        return this._allParents$;
    }
    get editorActiveTask$(): Observable<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined> {
        return this._editorActiveTask$;
    }
    get selectedBoard(): Board | undefined {
        return this._selectedBoard$.getValue();
    }
    get allTasks(): Task[] | undefined {
        return this._allTasks$.getValue();
    }
    getTask(id: string): Task | undefined {
        return this._allTasks$.getValue()?.find(t => t.id === id);
    }
    get focusSearch$(): Observable<boolean> {
        return this._focusSearch$;
    }
    setSelectedBoard(board: Board) {
        this._selectedBoard$.next(board);
    }
    get boards(): Board[] {
        return this._boards$.getValue();
    }
    get parents(): Container[] | undefined {
        return this._allParents$.getValue();
    }
    get lastSelectedTask(): {lane: Lane,task:Task} | undefined {
        return this._lastSelectedTask$.getValue();
    }   
    get selectedTasks(): Task[] | undefined {
        return this._selectedTasks$.getValue();
    }
    isSelected(board: Board) {
        return this._selectedBoard$.getValue()?.id === board.id;
    }
    /**
     * Adds a floating lane to the specified board.
     * The floating lane contains a single task and is positioned at the specified coordinates.
     * If the task already exists in any of the existing lanes, it is removed from those lanes.
     * If a lane becomes empty after removing the task, it is also removed from the board.
     * Finally, the new floating lane is added to the board and the updated boards are emitted.
     */
    addFloatingLane(board: Board, x: number, y: number, children: Task[] | undefined, archive: boolean): Lane {
        let boards = this._boards$.getValue();
        let activeBoard = boards.find(b => b.id === board.id);
        if (!activeBoard) {
            throw new Error(`Cannot find board for board ${board.id}`)
        }
        // activeBoard.children = activeBoard.children.filter(l => l.children.length > 0 || l.tags.length > 0);

        let newLane: Lane = getNewLane(archive);
        newLane.coordinates = { x, y };
        activeBoard.children.push(newLane);

        if (children) {
            this.addAsChild(newLane, children);
        }

        this._boards$.next(boards);

        return newLane;
    }

    updateStatus(board: Board, container: Container, status: Status | Status[] | undefined) {
        let boards = this._boards$.getValue();
        status = status && Array.isArray(status) ? status : (status ? [status] : undefined);
        if( this.isLane(container) ){
            container.status = status;
        }else{
            if(!status){
                throw new Error(`Cannot update status of a task to undefined`);
            }
            for (let s of status) {
                if(container.status){
                    setDateSafe(container, s, 'leave', new Date());
                }
                container.status = s;
                setDateSafe(container, s, 'enter', new Date());
                if( this.isTask(container) ){
                    this.evaluateArchiveMove(board, container);
                }
            }
        }

        this._boards$.next(boards);
    }

    /**
     * Evaluates the move of a task to/from the archive lane.
     */
    private evaluateArchiveMove(board: Board, task: Task) {
        let archive = board.children.find(l => l.isArchive);
        if (task.status === 'archived') {
            let lane = this.findParentLane([task]);
            if (lane) {
                // Removal from the original lane
                lane.children = lane.children.filter(t => t.id !== task.id);
            }
            if (!archive) {
                // create the archive
                archive = this.addFloatingLane(board, 0, 0, undefined, true);
            }
            // Check if the task is already displayed in the archive lane (can be a descendant of an archived task)
            let descendants = this.getDescendants(archive);
            if (descendants.find(t => t.id === task.id)) {
                // Do not add it
                console.warn(`Task with id ${task.id} is already in the archive, as a descendant of an archived task.`);
                return;
            }
            // Check if the task has any descendants that are already in the archive lane, and remove them
            let descendantsToRemove = this.getDescendants(task).filter(t => t.status === 'archived');
            descendantsToRemove.forEach(d => {
                archive!.children = archive!.children.filter(t => t.id !== d.id);
            })

            // add the task to the archived lane
            archive.children.push(task);
        } else {
            // Check if it is a first level task in the archive
            if (!archive?.children.find(t => t.id === task.id)) {
                // do not do anything
                console.warn(`Task with id ${task.id} is not a first level task in the archive.`);
                return;
            }
            // send the task back to the original lane
            // Identify the original lane
            let lane = this._allParents$.getValue()?.find(p => p.id === task.createdLaneId);
            if (lane) {
                // add the task to the original lane
                lane.children.push(task);
            } else {
                console.warn(`Cannot find lane with id ${task.createdLaneId}`);
                let lane = this.addFloatingLane(board, 0, 0, [task], false);
                task.createdLaneId = lane.id;
            }


            // remove the task from the archive
            archive?.children.splice(archive.children.findIndex(t => t.id === task.id), 1);
        }
    }

    getTaskInDirection(tasks: Task[] | undefined, direction: 'up' | 'down' | 'left' | 'right'): Task | undefined {
        if (!tasks || tasks.length === 0) {
            return;
        }

        // get outer parent of the tasks
        let parent = this.findParentLane(tasks);
        if (!parent) {
            return;
        }
        // let taskToFind = this.getTopLevelTasks(tasks);
        // get all the tasks in the lane, including descendants, in an ordered array
        let orderedLinearizedTasks = this.getDescendants(parent).filter(c => this.isTask(c)) as Task[];
        let index = 0;
        if (direction === 'up' || direction === 'left') {
            // Get smalles index from the tasks
            index = orderedLinearizedTasks.length - 1;
            for (let toCheck of tasks) {
                let internalIdx = orderedLinearizedTasks.findIndex(t => t.id === toCheck.id);
                index = internalIdx < index ? internalIdx : index;
            }
        } else {
            // Get bigger index from the tasks
            index = 0;
            for (let toCheck of tasks) {
                let internalIdx = orderedLinearizedTasks.findIndex(t => t.id === toCheck.id);
                index = internalIdx > index ? internalIdx : index;
            }
        }

        return orderedLinearizedTasks[direction === 'up' || direction === 'left' ? index - 1 : index + 1];
    }

    /**
     * Finds the direct parent container for the given objects
     */
    findDirectParent(objs: Container[] | undefined): Container | undefined {
        if (!objs || objs.length === 0) {
            return;
        }
        if (this.isTasks(objs)) {
            objs = this.getTopLevelTasks(objs);
        }

        let parents = this._allParents$.getValue()?.filter(p => p.children.length > 0 && p.children.find(c => objs.find(o => o.id === c.id)));
        // filter out duplicate parents and archive
        if(parents){
            // remove duplicates
            parents = parents?.filter((p, index) => parents!.findIndex(p2 => p2.id === p.id) === index);
            // remove archive 
            parents = parents?.filter(p => !this.isLane(p) || !p.isArchive);
        }

        if (!parents || parents?.length !== 1) {
            console.info('findParent: objs.length !== 1', objs);
            return;
        }
        return parents[0];
    }
    
    findParentLane(objs: Container[] | undefined): Lane | undefined {
        if (!objs || objs.length === 0) {
            return;
        }
        let parent = this.findDirectParent(objs);

        while (parent != null) {
            let grandParent = this.findDirectParent([parent]);
            if (this.isLane(parent)) {
                return parent;
            }
            parent = grandParent;
        }
        return undefined
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

        // sort children basing on their in the current parent's children
        let curParent = this.findDirectParent(children);
        if (curParent) {
            children = children.sort((a, b) => curParent.children.findIndex(c => c.id === a.id) - curParent.children.findIndex(c => c.id === b.id));
        }
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
            //this.tagService.extractAndUpdateTags(c);
        })


        // Publish the changes
        this._boards$.next(boards);
    }
    switchPosition(selectedTasks: Task[] | undefined, direction: 'ArrowUp' | 'ArrowDown') {
        if (!selectedTasks || selectedTasks.length === 0) {
            return;
        }

        /*
        if(selectedTasks.find( t => this.getDescendants(t).map( t => t.id ).find(id => id === nearby.id ) )){
            throw new Error(`Cannot switch position of a task with its descendants`);
        }*/
        selectedTasks = this.getTopLevelTasks(selectedTasks);

        let parent = this.findDirectParent(selectedTasks);
        if (!parent) {
            throw new Error(`Cannot find parent of the selected tasks`);
        }
        let siblings = parent?.children || [];

        let index = selectedTasks.map(sel => siblings.findIndex(s => s.id === sel.id)).sort( ( a,b ) => a - b )[0];

        // sort selected tasks basing on their order in the parent's children
        selectedTasks = selectedTasks.sort((a, b) => siblings.findIndex(s => s.id === a.id) - siblings.findIndex(s => s.id === b.id));

        if (direction === "ArrowUp" && index > 0) {
            parent.children.splice(index - 1, selectedTasks.length + 1, ...selectedTasks.concat(siblings[index - 1]));
        } else if (direction === "ArrowDown" && index < siblings.length - 1) {
            parent.children.splice(index, selectedTasks.length + 1, ...[siblings[index + selectedTasks.length]].concat(selectedTasks));
        }

        this.publishBoardUpdate();
    }

    removeChildrenAndAddAsSibling(parent: Container, children: Task[] | undefined) {
        if (!children || children.length === 0) {
            return;
        }
        let boards = this._boards$.getValue();

        children = this.getTopLevelTasks(children);

        // sort children basing on their order in the parent's children
        children = children.sort((a, b) => parent.children.findIndex(c => c.id === a.id) - parent.children.findIndex(c => c.id === b.id));

        parent.children = parent.children.filter(c => !children.find(t => t.id === c.id));



        // task need to become sibling of the parent. Find the parent of the parent
        let grandParent = this.findDirectParent([parent]);
        if (grandParent) {
            grandParent.children.splice(grandParent.children.findIndex(c => c.id === parent.id) + 1, 0, ...children);
            //grandParent.children = grandParent.children.concat(children);
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
    isTask(parent: Container | undefined): parent is Task {
        if (!parent) {
            return false;
        }
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

    deleteLane(lane: Lane) {
        if (lane.children.length > 0) {
            throw new Error(`Cannot delete lane with children`);
        }
        let boards = this._boards$.getValue();
        let board = boards.find(b => b.children.find(l => l.id === lane.id));
        if (!board) {
            throw new Error(`Cannot find board for lane with id ${lane.id}`);
        }
        board.children = board.children.filter(l => l.id !== lane.id);
        this._boards$.next(boards);
    }
    deleteTask(task: Task) {
        let boards = this._boards$.getValue();
        let parent = this.findDirectParent([task]);
        if (!parent) {
            throw new Error(`Cannot find parent for task with id ${task.id}`);
        }
        parent.children = parent.children.filter(c => c.id !== task.id);
        this._boards$.next(boards);
    }

    // Sorts first-level child by priority, and then by status
    autoSort(lane: Lane){
        let children = lane.children;
        children = children.filter( c => !isPlaceholder(c) ).sort((a, b) => {
            if( b.priority > a.priority ){
                return 1;
            }else if( b.priority < a.priority ){
                return -1;
            }else{
                return Object.keys(Statuses).indexOf(a.status) - Object.keys(Statuses).indexOf(b.status);
            }
        } );

        // insert a placeholder when the children priority changes respect to the previous one:
        let prevPriority: Priority | undefined;
        let i = 0;
        while( i < children.length ){
            if(isPlaceholder(children[i])){
                i++;
                prevPriority = undefined;
                continue;

            };
            if( prevPriority && children[i].priority !== prevPriority ){
                children.splice(i, 0, getNewTask(lane,""));
                children.splice(i, 0, getNewTask(lane,""));
                i++;
                continue;
            }
            prevPriority = children[i].priority;
            i++;
        }

        lane.children = children;
        this.publishBoardUpdate();
    }

    archiveDones(board: Board, lane: Lane) {
        // this._boards$.getValue();
        let descendants = this.getDescendants(lane);
        descendants.filter(t => this.isTask(t) && !isPlaceholder(t) && t.status === 'completed')
        .forEach(d => this.updateStatus(board, d, 'archived'));
        /*
        lane.children = lane.children.filter(t => !t.archived);
        let descendants = this.getDescendants(lane);
        descendants.forEach(d => d.children = d.children.filter(t => !t.archived));
        */
        this.publishBoardUpdate();
    }

    focusSearch() {
        this._focusSearch$.next(true)
    }
    blurSearch() {
        this._focusSearch$.next(false)
    }

    reorderLayoutColumn(board: Board, lane: Lane, direction?: string) {
        let colChildren = board.children.filter(l => l.layouts[board.layout].column === lane.layouts[board.layout].column).sort((a, b) => a.layouts[board.layout].order - b.layouts[board.layout].order);
        if(direction){
            let index = colChildren.findIndex(c => c.id === lane.id);
            if (index === -1) {
                throw new Error(`Cannot find lane with id ${lane.id}`);
            }
            let newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= colChildren.length) {
                return;
            }
            colChildren.splice(index, 1);
            colChildren.splice(newIndex, 0, lane);
        }
        colChildren.forEach((c, i) => c.layouts[board.layout].order = i);
        this.publishBoardUpdate();
    }
    moveToBoard(currentBoard: Board, lane:Lane, targetBoard: Board){
        currentBoard.children = currentBoard.children.filter(c => c.id !== lane.id);
        targetBoard.children.unshift(lane);
        this.publishBoardUpdate();
    }
    
    /**
     * Deserializes the given data and updates the state of the board service.
     * Performs an update on the status basing on the iteration on the app.

     */
    deserialize(data: string): void {
        let o = JSON.parse(data);
        if (!o.boards) {
            console.warn('No boards found in the data');
            this._boards$.next([getNewBoard(getNewLane(false))]);
            this._selectedTasks$.next([]);
            this._lastSelectedTask$.next(undefined);
            this._editorActiveTask$.next(undefined);
        } else {
            // fixes to existing data and new fields
            for( let board of o.boards ){
                board._type = 'board';
                board.layout = board.layout ?? 'absolute'; 
                board.flexColumns = board.flexColumns ?? undefined;
                let des = this.getDescendants(board);
                des.forEach(p => {
                    if (!p.creationDate) { 
                        p.creationDate = new Date().toISOString() as ISODateString;
                    }
                    if (typeof p.priority == 'undefined') {
                        p.priority = undefined;
                    }
                    if(!p.dates){
                        p.dates = {};
                    }

                    if(this.isLane(p)){
                        //p.columnNumber = p.columnNumber ?? 1;
                        //p.index = p.index ?? 0;
                        if(!p.layouts){
                            // @ts-ignore
                            p.layouts = getLayouts(p.width);
                        }
                        for( let layout of Object.keys(Layouts) ){
                            let l = layout as Layout;
                            let thisColLayout = p.layouts[l];
                            if( thisColLayout.column > Layouts[l].columns - 1 ){
                                thisColLayout.column = Layouts[l].columns - 1;                           
                            }
                        }
                    }
                    // @ts-ignore
                    //delete p.gantt;
                    // @ts-ignore
                    if(this.isLane(p) && typeof p.isArchive === 'undefined'){
                        // @ts-ignore
                        p.isArchive = p.archive ?? false;

                    }
                    // @ts-ignore
                    if(this.isTask(p) && p.archived ){ 
                        p.status = 'archived'; 
                        // @ts-ignore
                        p.dates.archived = { enter: p.archivedDate ?? new Date().toISOString() as ISODateString };
                    }
                    // @ts-ignore
                    //delete p.archived;
                    // @ts-ignore 
                    if( p.stateChangeDate && p.status && p.status !=='archived' ){ 
                        // @ts-ignore
                        p.dates[p.status] = { enter: p.stateChangeDate ?? new Date().toISOString() as ISODateString };
                        // @ts-ignore
                        //delete p.stateChangeDate;
                    }
                    if( this.isTask(p) && p.creationDate && (!p.dates['todo'] || !p.dates['todo'].enter) ){
                        if(!p.dates['todo']){
                            p.dates['todo'] = {};
                        }
                        p.dates['todo']['enter'] = p.creationDate;
                        // @ts-ignore
                        p.dates['todo']['leave'] = p.stateChangeDate;
                    }
                    //delete p.stateChangeDate;
                    // @ts-ignore
                    // delete p.archivedDate;
    
                    // Archive fix
                    if( this.isLane(p) && p.isArchive ){
                        // Case for archived tasks that are children of archived tasks. They should be moved to the archive lane.
                        let descendants = this.getDescendants(p);
                        let archivedFirstLevel = p.children.filter(c => c.status === 'archived');
                        archivedFirstLevel.forEach(a => {
                            let findInDescendants = descendants.filter(d => d.id === a.id);
                            if(findInDescendants.length > 1){
                                // this is a task that is a child of an archived task. Remove from direct descendants.
                                p.children = p.children.filter(c => c.id !== a.id);
                            }
                        });
                    }
    
    
    
                    if (p.tags) {
                        p.tags.forEach(t => {
                            if (!t.type) {
                                if (p.textContent.toLowerCase().indexOf(`${tagIdentifiers[0].symbol}${t.tag.toLowerCase()}`) >= 0) {
                                    t.type = tagIdentifiers[0].type
                                } else if (p.textContent.toLowerCase().indexOf(`${tagIdentifiers[1].symbol}${t.tag.toLowerCase()}`) >= 0) {
                                    t.type = tagIdentifiers[1].type
                                }
                            }
                        })
                    }
    
                });
                des.forEach(p => {
                    if (this.isTask(p) && !p.createdLaneId) {
                        let parentLane = this.findParentLane([p]) // can be archive;
                        let board = this._boards$.getValue().find(b => b.children.find(l => l.id === parentLane?.id));
                        p.createdLaneId = board?.children[0].id ?? '';
                    }
                }); 
            } 
            this._boards$.next(o.boards);
        }
        
        if(this._boards$.getValue().length === 0){
            this.addNewBoard();
        }
        this.selectFirstBoard();

    }
    reset() {
        this._boards$.next([]);
    }


}
