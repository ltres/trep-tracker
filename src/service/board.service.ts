import{Inject, Injectable, NgZone}from'@angular/core';
import{Board, Lane, Container, Task, Tag, getNewBoard, getNewLane, Priority, Status, StateChangeDate, getNewTask, Timeframe, AddFloatingLaneParams, RecurringTask, Recurrence, GanttTask, RecurringTaskChild, getStatesToArchive}from'../types/types';
import{BehaviorSubject, Observable, Subject, debounceTime, map}from'rxjs';
import{checkTaskSimilarity, eventuallyPatch, getDescendants, getProjectComputedStatus, initGanttData, isPlaceholder,  isStatic, stripHTML,}from'../utils/utils';
import{StorageServiceAbstract}from'../types/storage';
import{addUnitsToDate, fromIsoString, setDateSafe, shiftByRecurrence, toIsoString}from'../utils/date-utils';
import{recurringChildrenLimit, similarityTreshold, statusValues}from'../types/constants';
import{isTask, isLane, isTasks, assertIsRecurringTaskChild, isRecurringTask, isRecurringTaskChild, assertIsGanttTask, assertIsRecurringTask, isProject}from'../utils/guards';

@Injectable( {
  providedIn: 'root',
} )
export class BoardService{
  private _selectedBoard$: BehaviorSubject<Board | undefined> = new BehaviorSubject<Board | undefined>( undefined );

  private _detectChanges$: Subject<void> = new Subject<void>();

  private _boards$: BehaviorSubject<Board[]> = new BehaviorSubject<Board[]>( [] );
  private _editorActiveTask$: BehaviorSubject<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined> = new BehaviorSubject<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined>( undefined );

  private _allLanes$: BehaviorSubject<Lane[] | undefined> = new BehaviorSubject<Lane[] | undefined>( undefined );
  private _allTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>( undefined );
  private _allArchivedTasksIds$: BehaviorSubject<string[] | undefined> = new BehaviorSubject<string[] | undefined>( undefined );

  private _allParents$: BehaviorSubject<Container[] | undefined> = new BehaviorSubject<Container[] | undefined>( undefined );
  //private _allNuked$: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);

  private _selectedTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>( undefined );
  private _lastSelectedTask$: BehaviorSubject<{lane: Lane,task:Task} | undefined> = new BehaviorSubject<{lane: Lane,task:Task} | undefined>( undefined );
  private _focusSearch$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>( false );

  private boardUpdateCounter: number = 0;
  private statusStoredCounter: number = 0;

  constructor(
    zone: NgZone,
        @Inject( 'StorageServiceAbstract' ) private storageService: StorageServiceAbstract,
  ){

    const latestStatus = this.storageService.getStatus();
    if( latestStatus !== null ){
      this.deserialize( latestStatus );
    }
    this.storageService.getStatusChangeOutsideAppObservable().subscribe( status => {
      if( status !== null ){
        zone.run( () => {
          this.deserialize( status );
        } );
      }else{
        throw new Error( 'Cannot read status from storage after change' );
      }
    } );

    this._boards$.pipe(
      debounceTime( 5000 )
    ).subscribe( boards => {
      // run expensive operations:
      if( storageService.isStatusPresent() ){
        console.warn( 'Status stored', this.statusStoredCounter++ );
        this.storageService.writeToStatus( {boards} );
      }
    } )

    this._boards$.pipe(
      debounceTime( 1000 )
    ).subscribe( () => {
      // run expensive operations:
      const b = this._selectedBoard$.getValue()
      if( b ){
        // detect similarities in tasks:
        this.manageSimilaritiesInTasks( b )
        this._detectChanges$.next()
      }

    } ) 

    this._boards$.subscribe( b => {
      // const date = new Date();
      console.warn( 'Boards updated', this.boardUpdateCounter++ );
      let allTasks: Task[] = [];
      let allLanes: Lane[] = [];
      const allArchivedTasks: Task[] = [];
      b.forEach( board => {
        board.children.forEach( lane => {
          allTasks = allTasks.concat( lane.children );
          lane.children.forEach( task => {
            allTasks = allTasks.concat( getDescendants( task ).filter( t => isTask( t ) ) as Task[] );
          } );
          if( lane.isArchive ){
            allArchivedTasks.concat( getDescendants( lane ).filter( d => isTask( d ) ) )
          }
        } );
        // remove lanes without children
        // board.children = board.children.filter(l => l.children.length > 0);

        allLanes = allLanes.concat( board.children );
      } );
      // recurring child management:
      allTasks.filter( t => isRecurringTask( t ) ).filter( t => !getStatesToArchive().includes( t.status ) && !isPlaceholder( t ) ).forEach( t => {
        const recurrences = this.manageRecurringChildren( t );
        allTasks = allTasks.concat( recurrences );
      } )

      // Update project states
      allTasks.filter( t => isProject( t ) && !getStatesToArchive().includes( t.status ) ).forEach( p => {
        const computedStatus = getProjectComputedStatus( p );
        if( computedStatus !== p.status ){
          p.beforeProjectStatus = p.status
          this.updateStatus( undefined, p, computedStatus, true );
        }
      } )

      // Update ex-project status
      allTasks.filter( t => !isProject( t ) && t.beforeProjectStatus && t.beforeProjectStatus !== t.status ).forEach( t => {
        this.updateStatus( undefined, t, t.beforeProjectStatus, true );
        delete t.beforeProjectStatus
      } )

      this._allTasks$.next( allTasks );
      this._allArchivedTasksIds$.next( allArchivedTasks.map( t => t.id ) )
      this._allLanes$.next( allLanes );
      const allParents = [...allTasks, ...allLanes, ...this.boards];

      // Update parent references (except for children of archive lane)
      allParents.filter( p => !isLane( p ) || !p.isArchive ).forEach( p => p.children.forEach( c => c.parentId = p.id ) )

      this._allParents$.next( allParents );
      this._detectChanges$.next()
    } );
  }

  addNewBoard(){
    const board = getNewBoard();
    const firstLane = getNewLane( board, false )
    board.children = [firstLane];
    this._boards$.next( [...this._boards$.getValue(), board] );
  }

  addLane( board: Board ){
    this._boards$.next( [...this._boards$.getValue(), board] );
  }

  getLanes$( board: Board, columnNumber?: number ): Observable<Lane[]>{
    return this._boards$.pipe(
      map( boards => {
        let ret : Lane[] = [];
        ret = boards.find( b => b.id === board.id )?.children || [];
        if( typeof columnNumber !== 'undefined' ){
          ret = ret.filter( l => {
            return l.layouts[board.layout].column === columnNumber;
          } ).sort( ( a, b ) => a.layouts[board.layout].order - b.layouts[board.layout].order );
        }
        return ret;
      } ),
    );
  }

  getTasks$( lane: Lane, priority: Priority | Priority[] | undefined, status: Status | Status[] | undefined, sort: keyof StateChangeDate | undefined, sortOrder?: 'asc' | 'desc' ): Observable<Task[] | undefined>{
    return this._allLanes$.pipe(
      map( () => {
        let res = lane.children;

        if( priority ){
          if( Array.isArray( priority ) ){
            res = res?.filter( t => priority.includes( t.priority ) );
          }else{
            res = res?.filter( t => t.priority === priority );
          }
        }
        if( status ){
          if( Array.isArray( status ) ){
            res = res?.filter( t => status.includes( t.status ) );
          }else{
            res = res?.filter( t => t.status === status );
          }
        }

        const regex = /[-.:TZ]/g;
        if( sort ){
          if( sortOrder === 'desc' ){
            // eslint-disable-next-line no-constant-binary-expression
            res = res?.sort( ( b, a ) => ( Number( a.dates[sort]?.enter?.toString().replace( regex, '' ) ) ?? 0 ) - ( Number( b.dates[sort]?.enter?.toString().replace( regex, '' ) ) ?? 0 ) );
          }else{
            // eslint-disable-next-line no-constant-binary-expression
            res = res?.sort( ( a, b ) => ( Number( a.dates[sort]?.enter?.toString().replace( regex, '' ) ) ?? 0 ) - ( Number( b.dates[sort]?.enter?.toString().replace( regex, '' ) ) ?? 0 ) );
          }
        }
        return res;
      } ),
    );
  }

  getStaticTasks$( board: Board,tags: Tag[] | undefined, priority: Priority | Priority[] | undefined, status: Status | Status[] | undefined, startTimeframe: Timeframe | undefined, endTimeframe: Timeframe | undefined, excldeArchived: boolean, sort: keyof StateChangeDate | undefined, sortOrder?: 'asc' | 'desc' ): Observable<Task[] | undefined>{
    return this._boards$.pipe(
      map( boards => {
        const b = boards.find( b => b.id === board.id );
        if( !b ){
          throw new Error( `Cannot find board with id ${board.id}` );
        }
        const archivedTasks = this._allArchivedTasksIds$.getValue();

        let res = getDescendants( b ).filter( c => isTask( c ) && !archivedTasks?.includes( c.id ) ) as Task[];

        if( tags ){
          res = res?.filter( task =>
            task.tags.filter( t => tags.find( tag => tag.tag.toLowerCase() === t.tag.toLowerCase() ) ).length === tags.length,
          );
        }
        if( priority ){
          if( Array.isArray( priority ) ){
            res = res?.filter( t => priority.includes( t.priority ) );
          }else{
            res = res?.filter( t => t.priority === priority );
          }
        }
        if( status ){
          if( Array.isArray( status ) ){
            res = res?.filter( t => status.includes( t.status ) );
          }else{
            res = res?.filter( t => t.status === status );
          }
        }
        if( startTimeframe ){
          // get tasks within the given timeframe. Account for recurrences.
          const now = new Date();
          let startDate = now; 
          switch( startTimeframe ){
            case'no':
              throw new Error( "Recurrence filter requested with no recurrence" );
            case'6 hours':
              startDate = addUnitsToDate( now, 6, 'hour' );
              break;
            case'24 hours':
              startDate = addUnitsToDate( now, 1, 'day' );
              break;
            case'week':
              startDate = addUnitsToDate( now, 1, 'week' );
              break;
            case'month':
              startDate = addUnitsToDate( now, 1, 'month' );
              break;
            default:
              break;
          }
          res = res?.filter( t => {
            if( !t.gantt )return false;
            if( fromIsoString( t.gantt.startDate ) > now 
              && fromIsoString( t.gantt.startDate ) < startDate ){
              return true;
            }
            return false;
          } );
        }
        if( endTimeframe ){
          // get tasks within the given timeframe. Account for recurrences.
          const now = new Date();
          let endDate = now; 
          switch( endTimeframe ){
            case'no':
              throw new Error( "Recurrence filter requested with no recurrence" );
            case'6 hours':
              endDate = addUnitsToDate( now, 6, 'hour' );
              break;
            case'24 hours':
              endDate = addUnitsToDate( now, 1, 'day' );
              break;
            case'week':
              endDate = addUnitsToDate( now, 1, 'week' );
              break;
            case'month':
              endDate = addUnitsToDate( now, 1, 'month' );
              break;
            default:
              break;
          }
          res = res?.filter( t => {
            if( !t.gantt )return false;
            if( fromIsoString( t.gantt.endDate ) > now 
              && fromIsoString( t.gantt.endDate ) < endDate ){
              return true;
            }
            return false;
          } );
        }
        if( excldeArchived ){
          res = res?.filter( t => !getStatesToArchive().includes( t.status ) && !isPlaceholder( t ) );
        }
        const regex = /[-.:TZ]/g;
        if( sort ){
          if( sortOrder === 'desc' ){
            // eslint-disable-next-line no-constant-binary-expression
            res = res?.sort( ( b, a ) => ( Number( a.dates[sort]?.enter?.toString().replace( regex, '' ) ) ?? 0 ) - ( Number( b.dates[sort]?.enter?.toString().replace( regex, '' ) ) ?? 0 ) );
          }else{
            // eslint-disable-next-line no-constant-binary-expression
            res = res?.sort( ( a, b ) => ( Number( a.dates[sort]?.enter?.toString().replace( regex, '' ) ) ?? 0 ) - ( Number( b.dates[sort]?.enter?.toString().replace( regex, '' ) ) ?? 0 ) );
          }
        }

        res = res?.sort( ( a, b ) => ( b.priority ?? 0 ) - ( a.priority ?? 0 ) );

        return res;
      } ),
    );
  }

  /**
     * Retrieves non-archived, non-placeholder tasks for the given board.
     * @param board
     * @returns
     */
  getTasksForBoard$( board: Board ): Observable<Task[]>{
    return this._boards$.pipe(
      map( boards => {
        const b = boards.find( b => b.id === board.id );
        if( !b ){
          throw new Error( `Cannot find board with id ${board.id}` );
        }
        // get all lanes except the archive and static ones
        const lanes = b.children.filter( l => !l.isArchive && !isStatic( l ) );
        let tasks: Task[] = [];
        for( const lane of lanes ){
          const chilren = lane.children;
          for( const child of chilren ){
            // get all the descendants of the child except the placeholders and the archived ones, for the given priority
            tasks = tasks.concat( child ).concat( getDescendants( child ) as Task[] );
          }
        }
        return tasks.filter( c => !isPlaceholder( c ) && !getStatesToArchive().includes( c.status ) );
      } ),

    );
  }

  getTasksCount$( board: Board ): Observable<number>{
    return this.getTasksForBoard$( board ).pipe(
      map( tasks => tasks.length ),
    );
  }
  getTodoCount$( board: Board ): Observable<number>{
    return this.getTasksForBoard$( board ).pipe(
      map( tasks => tasks.filter( t => t.status === 'todo' ).length ),
    );
  }
  getTasksHavingPriorityCount$( board: Board, priority: Priority ): Observable<number>{
    return this.getTasksForBoard$( board ).pipe(
      map( tasks => tasks.filter( t => t.priority === priority ).length ),
    );
  }

  getLane$( lane: Lane ): Observable<Lane | undefined>{
    return this._boards$.pipe(
      map( boards => {
        const b = boards.find( board => board.children.find( l => l.id === lane.id ) );

        return b?.children.find( l => l.id === lane.id );
      } ),
    );
  }

  activateEditorOnTask( lane: Lane, task: Task, caretPosition: number | undefined ){
    if( this._editorActiveTask$.getValue()?.task.id === task.id && this._editorActiveTask$.getValue()?.lane.id === lane.id ){
      return;
    }
    this._editorActiveTask$.next( {lane, task, startingCaretPosition: caretPosition} );
  }

  toggleTaskSelection( lane: Lane, task: Task ){
    let cur = this._selectedTasks$.getValue() || [];
    if( cur?.find( t => t.id === task.id ) ){
      cur = cur.filter( t => t.id !== task.id );
    }else{
      cur?.push( task );
    }
    this._lastSelectedTask$.next( {lane,task} );
    this._selectedTasks$.next( cur );
  }
  addToSelection( lane: Lane, task: Task ){
    const cur = this._selectedTasks$.getValue() || [];
    if( cur?.find( t => t.id === task.id ) ){
      return;
    }
    cur?.push( task );
    this._lastSelectedTask$.next( {lane,task} );
    this._selectedTasks$.next( cur );
  }
  clearSelectedTasks(){
    this._selectedTasks$.next( [] );
  }
  selectFirstBoard(){
    const boards = this._boards$.getValue();
    if( boards.length === 0 ){
      return;
    }
    this._selectedBoard$.next( boards[0] );
  }

  get selectedTasks$(): Observable<Task[] | undefined>{
    return this._selectedTasks$;
  }
  get lastSelectedTask$(): Observable<{lane: Lane,task:Task} | undefined>{
    return this._lastSelectedTask$;
  }
  get selectedBoard$(): Observable<Board | undefined>{
    return this._selectedBoard$;
  }
  get boards$(): Observable<Board[]>{
    return this._boards$;
  }
  get parents$(): Observable<Container[] | undefined>{
    return this._allParents$;
  }
  get editorActiveTask$(): Observable<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined>{
    return this._editorActiveTask$;
  }
  get detectChanges$(): Observable<void>{
    return this._detectChanges$;
  }

  get selectedBoard(): Board | undefined{
    return this._selectedBoard$.getValue();
  }
  get allTasks(): Task[] | undefined{
    return this._allTasks$.getValue();
  }

  getTask( id: string ): Task | undefined{
    return this._allTasks$.getValue()?.find( t => t.id === id );
  }
  get focusSearch$(): Observable<boolean>{
    return this._focusSearch$;
  }
  setSelectedBoard( board: Board ){
    this._selectedBoard$.next( board );
  }
  get boards(): Board[]{
    return this._boards$.getValue();
  }
  get parents(): Container[] | undefined{
    return this._allParents$.getValue();
  }
  get lastSelectedTask(): {lane: Lane,task:Task} | undefined{
    return this._lastSelectedTask$.getValue();
  }
  get selectedTasks(): Task[] | undefined{
    return this._selectedTasks$.getValue();
  }
  isSelected( board: Board ){
    return this._selectedBoard$.getValue()?.id === board.id;
  }
  /**
     * Adds a floating lane to the specified board.
     * The floating lane contains a single task and is positioned at the specified coordinates.
     * If the task already exists in any of the existing lanes, it is removed from those lanes.
     * If a lane becomes empty after removing the task, it is also removed from the board.
     * Finally, the new floating lane is added to the board and the updated boards are emitted.
     */
  addFloatingLane( params: AddFloatingLaneParams ): Lane{
    const{board, x, y, children, archive, width, position} = params;

    const boards = this._boards$.getValue();
    const activeBoard = boards.find( b => b.id === board.id );
    if( !activeBoard ){
      throw new Error( `Cannot find board for board ${board.id}` );
    }
    // activeBoard.children = activeBoard.children.filter(l => l.children.length > 0 || l.tags.length > 0);

    const newLane: Lane = getNewLane( params.board, archive );
    newLane.coordinates = {x, y};
    if( width ){
      newLane.layouts.absolute.width = width;
    }
    if( position ){
      newLane.layouts[position.layout] = { 
        width: width ?? 300,
        column: position.column,
        order: position.order
      };
    }

    activeBoard.children.push( newLane );

    if( children ){
      this.addAsChild( newLane, children );
    }

    if( !params.skipBoardsUpdate ){
      this._boards$.next( boards );
    }

    return newLane;
  }

  updateStatus( board: Board | undefined, container: Container, status: Status | Status[] | undefined, preventUpdate = false ){
    const boards = this._boards$.getValue();
    status = status && Array.isArray( status ) ? status : ( status ? [status] : undefined );
    if( isLane( container ) ){
      container.status = status;
    }else{
      if( !status ){
        throw new Error( 'Cannot update status of a task to undefined' );
      }
      if( container.status ){
        if( !Array.isArray( container.status ) ){
          setDateSafe( container, container.status , 'leave', new Date() );

        }else{
          for( const s of container.status ){
            setDateSafe( container, s , 'leave', new Date() );
          }
        }
      }

      for( const s of status ){
        container.status = s;
        setDateSafe( container, s, 'enter', new Date() );
        if( isTask( container ) && board ){
          this.evaluateArchiveMove( board, container );
        }
      }

      // if the parent is a project, update its status accordingly:
      const p  = this.findDirectParent( [container] );
      if( isProject( p ) ){
        this.updateStatus( board, p, getProjectComputedStatus( p ), true )
      }
    }

    if( !preventUpdate ){
      this._boards$.next( boards );

    }
  }

  /**
     * Evaluates the move of a task to/from the archive lane.
     */
  private evaluateArchiveMove( board: Board, task: Task ){
    let archive = board.children.find( l => l.isArchive );
    if( getStatesToArchive().includes( task.status ) ){
      const parent = this.findDirectParent( [task] )
      if( parent ){
        task.parentId = parent.id;
        // Removal from the original parent
        parent.children = parent.children.filter( t => t.id !== task.id );
      }

      // task could be a recurrence child:
      const recurrenceParent = this.allTasks?.filter( t => isRecurringTask( t ) ).find( t => t.recurrences.map( r => r.id ).find( t => t === task.id ) );
      if( recurrenceParent ){
        task.parentId = recurrenceParent.id;
        recurrenceParent.recurrences = recurrenceParent.recurrences.filter( t => t.id !== task.id );
      }

      if( !archive ){
        // create the archive
        const params: AddFloatingLaneParams = {
          board, x:0, y:0, children: [], archive:true, width:300, skipBoardsUpdate: true
        }
        archive = this.addFloatingLane( params );
      }
      // Check if the task is already displayed in the archive lane (can be a descendant of an archived task)
      const descendants = getDescendants( archive );
      if( descendants.find( t => t.id === task.id ) ){
        // Do not add it
        console.warn( `Task with id ${task.id} is already in the archive, as a descendant of an archived task.` );
        return;
      }
      // Check if the task has any descendants that are already in the archive lane, and remove them
      const descendantsToRemove = getDescendants( task ).filter( t => getStatesToArchive().includes( ( t as Task ).status ) );
      descendantsToRemove.forEach( d => { archive!.children = archive!.children.filter( t => t.id !== d.id );
      } );

      // add the task to the archived lane
      archive.children.push( task );
    }else{
      // Check if it is a first level task in the archive
      if( !archive?.children.find( t => t.id === task.id ) ){
        // do not do anything
        // console.warn( `Task with id ${task.id} is not a first level task in the archive.` );
        return;
      }

      // if the task was a recurrence child, put it back on the parent
      if( isRecurringTaskChild( task ) ){
        const p = this._allTasks$.getValue()?.find( p => p.id === task.gantt!.fatherRecurringTaskId );
        if( p && isRecurringTask( p ) ){
          p.recurrences.push( task );
          p.recurrences.sort( ( r1,r2 ) => r1.gantt.recurringChildIndex - r2.gantt.recurringChildIndex )
        }
      }else{
        // send the task back to the original lane
        // Identify the original lane
        const parent = this._allParents$.getValue()?.find( p => p.id === task.parentId );
        if( parent ){
          // add the task to the original lane
          parent.children.push( task );
        }else{
          console.warn( `Cannot find lane with id ${task.parentId}` );
          const params: AddFloatingLaneParams = {
            board, x:0, y:0, children: [task], archive:false, width:300
          }
          const lane = this.addFloatingLane( params );
          task.parentId = lane.id;
        }
      }

      // remove the task from the archive
      archive?.children.splice( archive.children.findIndex( t => t.id === task.id ), 1 );
    }
  }

  getTaskInDirection( tasks: Task[] | undefined, direction: 'up' | 'down' | 'left' | 'right' ): Task | undefined{
    if( !tasks || tasks.length === 0 ){
      return;
    }

    // get outer parent of the tasks
    const parent = this.findParentLane( tasks );
    if( !parent ){
      return;
    }
    // let taskToFind = this.getTopLevelTasks(tasks);
    // get all the tasks in the lane, including descendants, in an ordered array
    const orderedLinearizedTasks = getDescendants( parent ).filter( c => isTask( c ) ) as Task[];
    let index = 0;
    if( direction === 'up' || direction === 'left' ){
      // Get smalles index from the tasks
      index = orderedLinearizedTasks.length - 1;
      for( const toCheck of tasks ){
        const internalIdx = orderedLinearizedTasks.findIndex( t => t.id === toCheck.id );
        index = internalIdx < index ? internalIdx : index;
      }
    }else{
      // Get bigger index from the tasks
      index = 0;
      for( const toCheck of tasks ){
        const internalIdx = orderedLinearizedTasks.findIndex( t => t.id === toCheck.id );
        index = internalIdx > index ? internalIdx : index;
      }
    }

    return orderedLinearizedTasks[direction === 'up' || direction === 'left' ? index - 1 : index + 1];
  }

  /**
     * Finds the direct parent container for the given objects
     */
  findDirectParent( objs: Container[] | undefined, includeArchive = false ): Container | undefined{
    if( !objs || objs.length === 0 ){
      return;
    }
    if( isTasks( objs ) ){
      objs = this.getTopLevelTasks( objs );
    }

    let parents = this._allParents$.getValue()?.filter( p => p.children.length > 0 && p.children.find( c => objs.find( o => o.id === c.id ) ) );
    // filter out duplicate parents and archive
    if( parents ){
      // remove duplicates
      parents = parents?.filter( ( p, index ) => parents!.findIndex( p2 => p2.id === p.id ) === index );
      // remove archive
      parents = parents?.filter( p => !isLane( p ) || ( isLane( p ) && ( includeArchive || !p.isArchive ) ) );
    }

    if( !parents || parents?.length !== 1 ){
      console.info( 'findParent: objs.length !== 1', objs );
      return;
    }
    return parents[0];
  }

  findParentLane( objs: Container[] | undefined ): Lane | undefined{
    if( !objs || objs.length === 0 ){
      return;
    }
    let parent = this.findDirectParent( objs, true );

    while( parent != null ){
      const grandParent = this.findDirectParent( [parent], true );
      if( isLane( parent ) ){
        return parent;
      }
      parent = grandParent;
    }
    return undefined;
  }

  /**
   * Adds the tasks as a sibling (before or after) the provided task. Removes the tasks from other parents.
   * @param parent 
   * @param sibling 
   * @param tasks 
   * @param position 
   * @returns 
   */
  addAsSiblings( parent: Container, sibling: Task | undefined, tasks: Task[] | undefined, position: 'before' | 'after' = 'before', removeSibling:boolean = false ){
    if( !tasks || tasks.length === 0 ){
      return;
    }
    const boards = this._boards$.getValue();

    tasks = this.getTopLevelTasks( tasks );

    // remove the task from any parent
    this._allParents$.getValue()?.forEach( p => {
      p.children = p.children.filter( c => !tasks?.find( t => t.id === c.id ) );
    } );

    if( sibling ){
      // find the index of the sibling
      const index = parent.children.findIndex( c => c.id === sibling.id );
      if( index === -1 ){
        throw new Error( `Cannot find sibling with id ${sibling.id} in parent with id ${parent.id}` );
      }
      // add the task before or after the sibling
      parent.children.splice( position === 'before' ? index : index + 1,  0, ...tasks );
      if( removeSibling ){
        parent.children = parent.children.filter( c => c.id !== sibling.id )
      }
    }else{
      // add the task at the end of the parent
      parent.children = parent.children.concat( tasks );
    }

    // Publish the changes
    this._boards$.next( boards );

  }

  /**
   * Adds the task(s) to the container, removing them from any other parent. Performs top level reduction for tasks.
   * @param parent 
   * @param children 
   * @returns 
   */
  addAsChild( parent: Container, children: Task[] | undefined, topPosition:boolean = false ){
    if( !children || children.length === 0 ){
      return;
    }
    if( isTask( parent ) && isPlaceholder( parent ) ){
      console.warn( `Parent is a placeholder` );
      return;
    }
    const boards = this._boards$.getValue();

    // incoming tasks could be related one another. Keep only the top level tasks
    children = this.getTopLevelTasks( children );

    // sort children basing on their in the current parent's children
    const curParent = this.findDirectParent( children );
    if( curParent ){
      children = children.sort( ( a, b ) => curParent.children.findIndex( c => c.id === a.id ) - curParent.children.findIndex( c => c.id === b.id ) );
    }
    // remove the child from any children set
    this._allParents$.getValue()?.forEach( p => {
      p.children = p.children.filter( c => !children.find( t => t.id === c.id ) );
    } );
    // add the child to the parent, if it is not already there
    children.forEach( child => {
      if( !parent.children.find( c => c.id === child.id ) ){
        if( topPosition ){
          parent.children.unshift( child )
        }else{
          parent.children.push( child )
        }
      }
    } );

    // remove custom coordinates from children
    children.forEach( c => {
      delete c.coordinates;
      //this.tagService.extractAndUpdateTags(c);
    } );

    // Publish the changes
    this._boards$.next( boards );
  }

  switchPosition( selectedTasks: Task[] | undefined, direction: 'ArrowUp' | 'ArrowDown' ){
    if( !selectedTasks || selectedTasks.length === 0 ){
      return;
    }

    /*
        if(selectedTasks.find( t => getDescendants(t).map( t => t.id ).find(id => id === nearby.id ) )){
            throw new Error(`Cannot switch position of a task with its descendants`);
        }*/
    selectedTasks = this.getTopLevelTasks( selectedTasks );

    const parent = this.findDirectParent( selectedTasks );
    if( !parent ){
      throw new Error( 'Cannot find parent of the selected tasks' );
    }
    const siblings = parent?.children as Task[] || [];

    const index = selectedTasks.map( sel => siblings.findIndex( s => s.id === sel.id ) ).sort( ( a,b ) => a - b )[0];

    // sort selected tasks basing on their order in the parent's children
    selectedTasks = selectedTasks.sort( ( a, b ) => siblings.findIndex( s => s.id === a.id ) - siblings.findIndex( s => s.id === b.id ) );

    if( direction === 'ArrowUp' && index > 0 ){
      parent.children.splice( index - 1, selectedTasks.length + 1, ...selectedTasks.concat( siblings[index - 1] ) );
    }else if( direction === 'ArrowDown' && index < siblings.length - 1 ){
      parent.children.splice( index, selectedTasks.length + 1, ...[siblings[index + selectedTasks.length]].concat( selectedTasks ) );
    }

    this.publishBoardUpdate();
  }

  removeChildrenAndAddAsSibling( parent: Container, children: Task[] | undefined ){
    if( !children || children.length === 0 ){
      return;
    }
    const boards = this._boards$.getValue();

    children = this.getTopLevelTasks( children );

    // sort children basing on their order in the parent's children
    children = children.sort( ( a, b ) => parent.children.findIndex( c => c.id === a.id ) - parent.children.findIndex( c => c.id === b.id ) );

    parent.children = parent.children.filter( c => !children.find( t => t.id === c.id ) );

    // task need to become sibling of the parent. Find the parent of the parent
    const grandParent = this.findDirectParent( [parent] );
    if( grandParent ){
      grandParent.children.splice( grandParent.children.findIndex( c => c.id === parent.id ) + 1, 0, ...children );
      //grandParent.children = grandParent.children.concat(children);
    }

    // Publish the changes
    this._boards$.next( boards );
  }

  /**
   * Retrieves only the tasks higher in the hierarchy.
   * Eg. if a task is a child of another, only the latter will be returned
   * @param tasks 
   * @returns 
   */
  getTopLevelTasks( tasks: Task[] ): Task[]{
    let ret: Task[] = [...tasks];
    // incoming tasks could be related one another. Keep only the top level tasks
    for( const child of tasks ){
      const descendants = getDescendants( child );
      ret = ret.filter( c => descendants.map( d => d.id ).indexOf( c.id ) === -1 );
    }
    return ret;
  }

  /**
 * Takes some task in input, gets all the descendants for them and returns only the descendants having dates set.
 * If any of those tasks belong to a project, return it as well.
 * @param tasks 
 */
  getTasksForGantt( tasks: Task[] ): Task[]{
    const allDescendantsHavingDates = tasks.flatMap( t => getDescendants( t ).concat( t ) ).filter( t => isTask( t ) ).filter( t => !isProject( t ) && t.gantt?.startDate );
    const projectsToAdd: Task[] = allDescendantsHavingDates.map( d => this.findDirectParent( [d] ) ).filter( p => isProject( p ) );
    return projectsToAdd.concat( allDescendantsHavingDates );
  }

  hasNextSibling( board: Board, task: Task ): boolean{
    let has: boolean = false;
    this._allParents$.getValue()?.forEach( p => {
      const index = p.children.findIndex( c => c.id === task.id );
      if( index !== -1 && index < p.children.length - 1 ){
        has = true;
      }
    } );
    return has;
  }

  publishBoardUpdate(){
    this._boards$.next( this._boards$.getValue() );
  }

  deleteLane( lane: Lane ){
    if( lane.children.length > 0 ){
      throw new Error( 'Cannot delete lane with children' );
    }
    const boards = this._boards$.getValue();
    const board = boards.find( b => b.children.find( l => l.id === lane.id ) );
    if( !board ){
      throw new Error( `Cannot find board for lane with id ${lane.id}` );
    }
    board.children = board.children.filter( l => l.id !== lane.id );
    this._boards$.next( boards );
  }
  deleteTask( task: Task ){
    const boards = this._boards$.getValue();
    const parent = this.findDirectParent( [task] );
    if( !parent ){
      throw new Error( `Cannot find parent for task with id ${task.id}` );
    }
    parent.children = parent.children.filter( c => c.id !== task.id );
    this._boards$.next( boards );
  }

  // Sorts first-level child by priority, and then by status
  autoSort( lane: Lane ){
    let children = lane.children;
    children = children.filter( c => !isPlaceholder( c ) ).sort( ( a, b ) => {
      if( b.priority > a.priority ){
        return 1;
      }else if( b.priority < a.priority ){
        return-1;
      }else{
        return Object.keys( statusValues ).indexOf( a.status ) - Object.keys( statusValues ).indexOf( b.status );
      }
    } );

    // insert a placeholder when the children priority changes respect to the previous one:
    let prevPriority: Priority | undefined;
    let i = 0;
    while( i < children.length ){
      if( isPlaceholder( children[i] ) ){
        i++;
        prevPriority = undefined;
        continue;

      };
      if( prevPriority && children[i].priority !== prevPriority ){
        children.splice( i, 0, getNewTask( lane, undefined, '' ) );
        continue;
      }
      prevPriority = children[i].priority;
      i++;
    }

    lane.children = children;
    this.publishBoardUpdate();
  }

  archiveDones( board: Board, lane: Lane ){
    // this._boards$.getValue();
    const descendants = getDescendants( lane );
    descendants.filter( t => isTask( t ) && !isPlaceholder( t ) && t.status === 'completed' )
      .forEach( d => this.updateStatus( board, d, 'archived' ) );
    /*
        lane.children = lane.children.filter(t => !t.archived);
        let descendants = getDescendants(lane);
        descendants.forEach(d => d.children = d.children.filter(t => !t.archived));
        */
    this.publishBoardUpdate();
  }

  focusSearch(){
    this._focusSearch$.next( true );
  }
  blurSearch(){
    this._focusSearch$.next( false );
  }

  moveLaneInColumn( board: Board, lane: Lane, direction?: string ){
    const colChildren = board.children.filter( l => l.layouts[board.layout].column === lane.layouts[board.layout].column ).sort( ( a, b ) => a.layouts[board.layout].order - b.layouts[board.layout].order );
    if( direction ){
      const index = colChildren.findIndex( c => c.id === lane.id );
      if( index === -1 ){
        throw new Error( `Cannot find lane with id ${lane.id}` );
      }
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if( newIndex < 0 || newIndex >= colChildren.length ){
        return;
      }
      colChildren.splice( index, 1 );
      colChildren.splice( newIndex, 0, lane );
    }
    colChildren.forEach( ( c, i ) => c.layouts[board.layout].order = i );
    this.publishBoardUpdate();
  }
  moveToBoard( currentBoard: Board, lane:Lane, targetBoard: Board ){
    currentBoard.children = currentBoard.children.filter( c => c.id !== lane.id );
    targetBoard.children.unshift( lane );
    lane.parentId = targetBoard.id;
    this.publishBoardUpdate();
  }
  
  /**
   * Sets start and end date on a task, transforming it into a GanttTask (initializes gantt data if missing). If a recurrence is provided, reinitializes recurrence data (old data is erased)
   * @param task 
   * @param start 
   * @param end 
   * @param recurrence 
   */
  setTaskDates( task: Task, start: Date, end: Date, recurrence? :Recurrence ): GanttTask{
    if( !task.gantt ){
      initGanttData( task, undefined );
    }
    let datesChanged = false;
    task.gantt!.showData = true;
    if( task.gantt!.startDate !== toIsoString( start ) || task.gantt!.endDate !== toIsoString( end ) ){
      datesChanged = true;
    }
    task.gantt!.startDate = toIsoString( start );
    task.gantt!.endDate = toIsoString( end );
    
    task.gantt!.progress = 0;
    assertIsGanttTask( task );

    if( recurrence && recurrence !== 'no' ){
      if( !task.gantt ){
        initGanttData( task, undefined );
      }
  
      task.gantt.recurrence = recurrence;
      task.gantt.displayRecurrence = true;
      task.recurrences = [];
      assertIsRecurringTask( task );
      
      if( datesChanged || recurrence !== task.gantt.recurrence ){
        task.recurrences = [];
      }
    }else{
      delete task.gantt?.recurrence;
    }

    this.publishBoardUpdate();
    return task;
  }

  /**
   * Compares all the tasks in the board for text similarities. If any similarity is found, tasks get linked.
   * @param board 
   */
  manageSimilaritiesInTasks( board: Board ){
    const start = new Date().getTime();
    const descendants: Task[] = getDescendants( board ).filter( d => isTask( d ) ).filter( d => !getStatesToArchive().includes( d.status ) );
    const processed: Task[] = [];
    descendants.forEach( d => d.similarTasks = [] );
    for( const d of descendants ){
      for( const d2 of descendants.filter( v => v.id !== d.id && !processed.includes( v ) ) ){
        const sIndex = checkTaskSimilarity( d, d2 );
        if( sIndex >= similarityTreshold ){
          console.log( `${stripHTML( d.textContent )} => ${stripHTML( d2.textContent )} = ${checkTaskSimilarity( d, d2 )}` );
          d.similarTasks.push( {id:d2.id, similarity: sIndex} );
          d2.similarTasks.push( {id:d.id, similarity: sIndex} );
        }
      }
      processed.push( d )
    }
    console.warn( `Similarities check took ${ new Date().getTime() - start }ms` )
  }

  /**
   * Takes a recurrent task and manages its recurring children.
   * Keep the children in a 'todo' state to a certain threshold.
   * Discards 'todo' children in the past.
   * @param dateToCenter 
   * @param task 
   * @returns 
  */
  manageRecurringChildren( task: RecurringTask ): RecurringTaskChild[]{
    const today = new Date();

    // Update status for children that are in the past and still in todo:
    task.recurrences.filter( c => {
      if( c.status === 'todo' && new Date( c.gantt.endDate ) < today ){
        return true;
      }
      return false;
    } ).forEach( c => this.updateStatus( undefined, c, 'discarded' ) )

    const recurrencesToConsider = task.recurrences.filter( t => t.status === 'todo' )

    if( recurrencesToConsider.length >= recurringChildrenLimit ){
      return task.recurrences
    }

    const latestTask = recurrencesToConsider.length > 0 ? recurrencesToConsider[recurrencesToConsider.length - 1] : task

    // dates to begin the calculation could be the original task dates or the latest task recurrence child
    const originalStartDate = new Date( latestTask.gantt.startDate );
    const originalEndDate = new Date( latestTask.gantt.endDate );

    let childStartDate = originalStartDate;
    let childEndDate = originalEndDate;

    let currentRecurringChildIndex = task.recurrences.length > 0 ? Math.max( ...task.recurrences.map( r => r.gantt.recurringChildIndex ) ) + 1 : 0

    const originalDatesInThePast = originalStartDate < today && originalEndDate < today;
    if( originalDatesInThePast ){
      // we need to find the first recurrence which has the end date in the future to display it as first recurrence:
      while( childEndDate < today ){
        childStartDate = shiftByRecurrence( childStartDate, task.gantt.recurrence );
        childEndDate = shiftByRecurrence( childEndDate, task.gantt.recurrence )
      }
    }else{
      childStartDate = shiftByRecurrence( childStartDate, task.gantt.recurrence );
      childEndDate =  shiftByRecurrence( childEndDate, task.gantt.recurrence );
    }

    // now we have the date for the first child that is running today or is in the future.
    // Calculate the next child dates accordingly:
    for( let k = 0; k < recurringChildrenLimit - recurrencesToConsider.length; k++ ){
      // Calculate the next child dates accordingly:

      // Manage following children:
      const nextChild = getNewTask( task.id, undefined, task.textContent );
      nextChild.gantt = {
        showData: true,
        startDate: toIsoString( childStartDate ),
        endDate: toIsoString( childEndDate ),
        progress: 0,
        recurringChildIndex: currentRecurringChildIndex++,
        fatherRecurringTaskId: task.id,
        successors:[]
      }
      assertIsRecurringTaskChild( nextChild );
      task.recurrences.push( nextChild );

      childStartDate = shiftByRecurrence( childStartDate, task.gantt.recurrence );
      childEndDate =  shiftByRecurrence( childEndDate, task.gantt.recurrence );
    }

    return task.recurrences

  }

  findTask( id:string ):Task | undefined{
    return this._allTasks$.getValue()?.find( t => t.id === id )
  }

  /**
    * Deserializes the given data and updates the state of the board service.
    * Performs an update on the status basing on the iteration on the app.
  */
  deserialize( data: string ): void{
    const o = JSON.parse( data );
    if( !o.boards ){
      console.warn( 'No boards found in the data' );
      const board = getNewBoard(  );
      const lane = getNewLane( board,false )
      board.children = [lane]
      this._boards$.next( [board] );
      this._selectedTasks$.next( [] );
      this._lastSelectedTask$.next( undefined );
      this._editorActiveTask$.next( undefined );
    }else{
      // fixes to existing data and new fields
      for( let board of o.boards ){
        board = eventuallyPatch( board );
      }
      this._boards$.next( o.boards );
    }

    if( this._boards$.getValue().length === 0 ){
      this.addNewBoard();
    }
    this.selectFirstBoard();
  }

  reset(){
    this._boards$.next( [] );
  }
}
