import { Injectable, Injector } from "@angular/core";
import { Board, Lane, Container, Task, Tag, DoneTag, ArchivedTag, tagIdentifiers, getNewBoard, getNewLane, Priority } from "../types/task";
import { BehaviorSubject, Observable, filter, map } from "rxjs";
import { generateUUID } from "../utils/utils";
import { TagService } from "./tag.service";

@Injectable({
    providedIn: 'root'
})
export class BoardService {

    private _selectedBoard$: BehaviorSubject<Board | undefined> = new BehaviorSubject<Board | undefined>(undefined);

    private _boards$: BehaviorSubject<Board[]> = new BehaviorSubject<Board[]>([]);
    private _editorActiveTask$: BehaviorSubject<{task: Task , startingCaretPosition: number | undefined} | undefined> = new BehaviorSubject<{task: Task, startingCaretPosition: number | undefined} | undefined>(undefined);

    private _allLanes$: BehaviorSubject<Lane[] | undefined> = new BehaviorSubject<Lane[] | undefined>(undefined);
    private _allTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>(undefined);
    private _allParents$: BehaviorSubject<Container[] | undefined> = new BehaviorSubject<Container[] | undefined>(undefined);
    //private _allNuked$: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);

    private _selectedTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>(undefined);
    private _lastSelectedTask$: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);

    private tagService!: TagService;

    constructor(injector:Injector) {

        setTimeout(() => this.tagService = injector.get(TagService));
        this._boards$.subscribe(b => {
            console.info('Boards updated');
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
        })
    }

    getDescendants(container: Container): Container[] {
        let descendants: Container[] = [];
        for (let child of container.children) {
            descendants = descendants.concat(child).concat(this.getDescendants(child));
        }

        return descendants
    }

    addNewBoard() {
        let board = getNewBoard( getNewLane() )

        this._boards$.next([...this._boards$.getValue(), board]);
    }
    addLane(board: Board) {
        this._boards$.next([...this._boards$.getValue(), board]);
    }

    getLanes$(board: Board): Observable<Lane[]> {
        return this._boards$.pipe(
            map(boards => boards.find(b => b.id === board.id)?.children || [])
        );
    }

    getTasks$(lane: Lane, priority: Priority | undefined): Observable<Task[] | undefined> {
        return this._allLanes$.pipe(
            map(lanes => {
                let res = lanes?.find(l => l.id === lane.id)?.children
                if( priority ){
                    res = res?.filter( t => t.priority === priority );
                }
                return res;
            })
        )
    }

    getTaggedTasks$(tags: Tag[] | undefined, priority: Priority | undefined): Observable<Task[] | undefined> {
        return this._allTasks$.pipe(
            map(tasks => {
                let res = tasks;

                if(tags){
                    res = tasks?.filter(task => 
                        task.tags.filter( t => tags.find(tag => tag.tag.toLowerCase() === t.tag.toLowerCase())).length === tags.length
                    )
                }
                if( priority ){
                    res = res?.filter( t => t.priority === priority );
                }

                res = res?.sort((a, b) => (b.priority ?? 0) - ( a.priority ?? 0 ));

                return res;
            })
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

    activateEditorOnTask( task: Task, caretPosition: number | undefined) {
        if (this._editorActiveTask$.getValue()?.task === task) {
            return
        }
        this._editorActiveTask$.next({task, startingCaretPosition: caretPosition});
    }

    toggleTaskSelection(task: Task) {
        let cur = this._selectedTasks$.getValue() || [];
        if (cur?.find(t => t.id === task.id)) {
            cur = cur.filter(t => t.id !== task.id);
        } else {
            cur?.push(task);
        }
        this._lastSelectedTask$.next(task);
        this._selectedTasks$.next(cur);
    }
    addToSelection(task: Task) {
        let cur = this._selectedTasks$.getValue() || [];
        if (cur?.find(t => t.id === task.id)) {
            return;
        }
        cur?.push(task);
        this._lastSelectedTask$.next(task);
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
    get lastSelectedTask$(): Observable<Task | undefined> {
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
    get editorActiveTask$(): Observable<{task: Task, startingCaretPosition: number | undefined}  | undefined> {
        return this._editorActiveTask$;
    }
    get selectedBoard(): Board | undefined {
        return this._selectedBoard$.getValue();
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
    get lastSelectedTask(): Task | undefined {
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
    addFloatingLane(board: Board, x: number, y: number, children: Task[] | undefined): Lane {
        let boards = this._boards$.getValue();
        let activeBoard = boards.find(b => b.id === board.id);
        if (!activeBoard) {
            throw new Error(`Cannot find board for board ${board.id}`)
        }
        activeBoard.children = activeBoard.children.filter(l => l.children.length > 0 || l.tags.length > 0);

        let newLane: Lane = getNewLane();
        newLane.coordinates = { x, y };
        activeBoard.children.push(newLane);

        if (children) {
            this.addAsChild(newLane, children);
        }

        this._boards$.next(boards);

        return newLane;
    }

    toggleTaskStatus(task: Task) {
        let boards = this._boards$.getValue();
        task.status = task.status === 'completed' ? 'todo' : 'completed';
        if(task.status === 'completed'){
            task.textContent.indexOf(DoneTag.tag) === -1 ? task.textContent += '&nbsp;' + tagIdentifiers[0].symbol + DoneTag.tag : task.textContent;
        }else{
            task.textContent = task.textContent.replace(tagIdentifiers[0].symbol + DoneTag.tag, '');
        }
        task.stateChangeDate = new Date();
        this.tagService.extractAndUpdateTags(task);
        this._boards$.next(boards);
    }

    toggleArchived(task: Task) {
        let boards = this._boards$.getValue();
        task.archived = !task.archived;
        if(task.archived){
            task.textContent.indexOf(ArchivedTag.tag) === -1 ? task.textContent += '&nbsp;' + tagIdentifiers[0].symbol + ArchivedTag.tag : task.textContent;
        }else{
            task.textContent = task.textContent.replace(tagIdentifiers[0].symbol + ArchivedTag.tag, '');
        }
        task.archivedDate = new Date();
        this.tagService.extractAndUpdateTags(task);
        this._boards$.next(boards);
    }

    getTaskInDirection( tasks: Task[] | undefined, direction: 'up' | 'down' | 'left' | 'right'): Task | undefined {
        if (!tasks || tasks.length === 0) {
            return;
        }

        // get outer parent of the tasks
        let parent = this.findAncestor(tasks);
        if (!parent) {
            return;
        }
        // let taskToFind = this.getTopLevelTasks(tasks);
        // get all the tasks in the lane, including descendants, in an ordered array
        let orderedLinearizedTasks = this.getDescendants(parent).filter(c => this.isTask(c)) as Task[];
        let index = 0;
        if( direction === 'up' || direction === 'left' ){
            // Get smalles index from the tasks
            index = orderedLinearizedTasks.length - 1;
            for (let toCheck of tasks) {
                let internalIdx = orderedLinearizedTasks.findIndex(t => t.id === toCheck.id);
                index = internalIdx < index ? internalIdx : index;
            }
        }else{
            // Get bigger index from the tasks
            index = 0;
            for (let toCheck of tasks) {
                let internalIdx = orderedLinearizedTasks.findIndex(t => t.id === toCheck.id);
                index = internalIdx > index ? internalIdx : index;
            }
        }

        return orderedLinearizedTasks[direction === 'up' || direction === 'left' ? index - 1 : index + 1];
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
    findAncestor(objs:Container[] | undefined): Container | undefined {
        if (!objs || objs.length === 0) {
            return;
        }
        let parent = this.findParent(objs);

        while( parent != null ){
            let grandParent = this.findParent([parent]);
            if( !grandParent ){
                return parent;
            }
            parent = grandParent;
        }
        return parent
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
            this.tagService.extractAndUpdateTags(c);
        })
        

        // Publish the changes
        this._boards$.next(boards);
    }
    switchPosition(selectedTasks: Task[] | undefined, direction: 'ArrowUp'| 'ArrowDown') {
        if (!selectedTasks || selectedTasks.length === 0) {
            return;
        }

        /*
        if(selectedTasks.find( t => this.getDescendants(t).map( t => t.id ).find(id => id === nearby.id ) )){
            throw new Error(`Cannot switch position of a task with its descendants`);
        }*/
        selectedTasks = this.getTopLevelTasks(selectedTasks);

        let parent = this.findParent(selectedTasks);
        if(!parent){
            throw new Error(`Cannot find parent of the selected tasks`);
        }
        let siblings = parent?.children || [];

        let index = selectedTasks.map( sel => siblings.findIndex( s => s.id === sel.id )).sort()[0];

        if( direction === "ArrowUp" && index > 0 ){
            parent.children.splice(index - 1, selectedTasks.length + 1, ...selectedTasks.concat( siblings[index - 1] ) );
        }else if( direction === "ArrowDown" && index < siblings.length - 1 ){
            parent.children.splice(index, selectedTasks.length + 1, ...[siblings[index + selectedTasks.length]].concat( selectedTasks ) );
        }

        this.publishBoardUpdate();
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
        if(lane.children.length > 0){
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

    nukeArchived(lane: Lane) {
        // this._boards$.getValue();
        
        lane.children = lane.children.filter(t => !t.archived);
        let descendants = this.getDescendants(lane);
        descendants.forEach(d => d.children = d.children.filter(t => !t.archived));
        
        this.publishBoardUpdate();
    }

    serialize(): string{
        let boards = this._boards$.getValue();
        //let selectedTasks = this._selectedTasks$.getValue();
        //let lastSelectedTask = this._lastSelectedTask$.getValue();
        //let editorActiveTask = this._editorActiveTask$.getValue();

        return JSON.stringify({boards});
    }
    deserialize(data: string): void{
        let o = JSON.parse(data);
        if(!o.boards){
            console.warn('No boards found in the data');
            this._boards$.next([]);        
            this._selectedTasks$.next([]);
            this._lastSelectedTask$.next(undefined);
            this._editorActiveTask$.next(undefined);
        }else{
            // fixes to existing data and new fields
            


            this._boards$.next(o.boards);
            this.parents?.forEach(p => {
                if(!p.creationDate){
                    p.creationDate = new Date();
                }
                if(p.priority == null){
                    p.priority = undefined;
                }
                if(p.archived == null){
                    p.archived = false
                }

            });
            //this._selectedTasks$.next(o.selectedTasks ?? []);
            //this._lastSelectedTask$.next(o.lastSelectedTask ?? []);
            //this._editorActiveTask$.next(o.editorActiveTask ?? []);
        }
    }
    reset() {
        this._boards$.next([]);
    }
}
