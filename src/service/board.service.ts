import{Inject, Injectable, Injector, NgZone}from'@angular/core';
import{Board, Lane, Container, Task, Tag, getNewBoard, getNewLane, Priority, Status, StateChangeDate, getNewTask, Timeframe, AddFloatingLaneParams, TimedTask, Project}from'../types/types';
import{BehaviorSubject, Observable, asyncScheduler, debounceTime, map, observeOn}from'rxjs';
import{checkTaskSimilarity, eventuallyPatch, getDescendants, getProjectComputedStatus, initTimeData, isArchived, isArchivedOrDiscarded, isPlaceholder,  isStatic,}from'../utils/utils';
import{StorageServiceAbstract}from'../types/storage';
import{addUnitsToDate, snapToWorkDays, calculateWorkingHours, fromIsoString, setDateSafe, toIsoString}from'../utils/date-utils';
import{boardDebounceDelay, similarityTreshold, statusValues}from'../types/constants';
import{isTask, isLane, isTasks, isProject, assertIsTask, isBoard, isTimedTask, isFixedTimedTask, isRollingTimedTask, assertIsTimedTask}from'../utils/guards';
import{ logPerformance }from'../utils/performance-logger';
import{ ChangePublisherService }from'./change-publisher.service';

@Injectable( {
  providedIn: 'root',
} )
export class BoardService{
  private _selectedBoard$: BehaviorSubject<Board | undefined> = new BehaviorSubject<Board | undefined>( undefined );

  private _boards$: BehaviorSubject<Board[]> = new BehaviorSubject<Board[]>( [] );
  private _editorActiveTask$: BehaviorSubject<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined> = new BehaviorSubject<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined>( undefined );

  private _allLanes$: BehaviorSubject<Lane[] | undefined> = new BehaviorSubject<Lane[] | undefined>( undefined );
  private _allTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>( undefined );
  private _allArchivedTasksIds$: BehaviorSubject<string[] | undefined> = new BehaviorSubject<string[] | undefined>( undefined );

  private _allParents$: BehaviorSubject<Container[] | undefined> = new BehaviorSubject<Container[] | undefined>( undefined );
  //private _allNuked$: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);

  private _selectedTasks$: BehaviorSubject<Task[] | undefined> = new BehaviorSubject<Task[] | undefined>( undefined );
  private _lastSelectedTask$: BehaviorSubject<{lane: Lane, task:Task} | undefined> = new BehaviorSubject<{lane: Lane, task:Task} | undefined>( undefined );
  private _focusSearch$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>( false );

  private boardUpdateCounter: number = 0;
  private statusStoredCounter: number = 0;

  constructor(
    private injector: Injector,
    zone: NgZone,
        @Inject( 'StorageServiceAbstract' ) private storageService: StorageServiceAbstract,
        private changePublisherService: ChangePublisherService
  ){
    setTimeout( () => this.changePublisherService = injector.get( ChangePublisherService ) );

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

    this.changePublisherService.pushedChanges$.pipe(
      observeOn( asyncScheduler ), // Switch to asynchronous execution
      debounceTime( boardDebounceDelay.huge )
    ).subscribe( ()=> {
      const boards = this._boards$.getValue();
      // store the status after some inactivity:
      if( storageService.isStatusPresent() ){
        console.warn( 'Status stored', this.statusStoredCounter++ );
        this.storageService.writeToStatus( {boards} );
      }
    } )

    let latestSimilarities: string[] = [];
    this.changePublisherService.pushedChanges$.pipe(
      observeOn( asyncScheduler ), // Switch to asynchronous execution
      debounceTime( boardDebounceDelay.small )
    ).subscribe( () => {
      // run expensive operations:
      const b = this._selectedBoard$.getValue()
      if( b ){
        // detect similarities in tasks:
        const toProcess = this.manageSimilaritiesInTasks( b );
        if( latestSimilarities.sort().toString() !== toProcess.map( p => p.id ).sort().toString()  ){
          // republish another change if there is any change in similarities
          latestSimilarities = toProcess.map( p => p.id ).sort();
          this.changePublisherService.processChangesAndPublishUpdate( toProcess, true );
        }
      }
    } ) 

    /**
     * Rebuilds the datamodel observables on change
     */
    this.changePublisherService.pushedChanges$.pipe(
      observeOn( asyncScheduler ), // Switch to asynchronous execution
      debounceTime( boardDebounceDelay.micro )
    ).subscribe( () => {
      const b = this._boards$.getValue();
      this._boards$.next( b )
      logPerformance( "boards observable", true );

      // const date = new Date();
      console.warn( 'Boards updated', this.boardUpdateCounter++ );
      this.populateDatamodelDerivedObservables( b )

    } );
  }

  populateDatamodelDerivedObservables( b: Board[] ){

    // const date = new Date();
    let allTasks: Task[] = [];
    let allLanes: Lane[] = [];
    const allArchivedTasks: Task[] = [];
    b.forEach( board => {
      board.children.forEach( lane => {
        // lane.children = lane.children.filter(  c => !c.archivedDate )
        allTasks = allTasks.concat( lane.children );
        lane.children.forEach( task => {
          allTasks = allTasks.concat( getDescendants( task ).filter( t => isTask( t ) ) as Task[] );
        } );
        if( lane.isArchive ){
          allArchivedTasks.concat( getDescendants( lane ).filter( d => isTask( d ) ) )
        }
      } );
      logPerformance( "boards observable" );

      // remove lanes without children
      // board.children = board.children.filter(l => l.children.length > 0);

      allLanes = allLanes.concat( board.children );
    } );

    this._allTasks$.next( allTasks );
    this._allArchivedTasksIds$.next( allArchivedTasks.map( t => t.id ) )
    this._allLanes$.next( allLanes );
    const allParents = [...allTasks, ...allLanes, ...this.boards];

    // Update parent references (except for children of archive lane)
    allParents.filter( p => !isLane( p ) || !p.isArchive ).forEach( p => p.children.forEach( c => c.parentId = p.id ) )

    this._allParents$.next( allParents );
    logPerformance( "boards observable" );
  }

  addNewBoard(): Board{
    const board = getNewBoard();
    const firstLane = getNewLane( board, false )
    board.children = [firstLane];
    this._boards$.next( [...this._boards$.getValue(), board] );

    return board;
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

  getStaticTasks$( board: Board, tags: Tag[] | undefined, priority: Priority | Priority[] | undefined, status: Status | Status[] | undefined, startTimeframe: Timeframe | undefined, endTimeframe: Timeframe | undefined, excldeArchived: boolean, sort: keyof StateChangeDate | undefined, sortOrder?: 'asc' | 'desc' ): Observable<Task[] | undefined>{
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
            if( !isFixedTimedTask( t ) &&!isRollingTimedTask( t ) )return false;
            const time = this.getComputedTaskDates( t );

            if(  time.startDate > now && time.startDate < startDate ){
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
            if( !isFixedTimedTask( t ) &&!isRollingTimedTask( t ) )return false;
            const time = this.getComputedTaskDates( t );

            if(  time.endDate  > now && time.endDate < endDate ){
              return true;
            }
            return false;
          } );
        }
        if( excldeArchived ){
          res = res?.filter( t => !isArchivedOrDiscarded( t ) && !isPlaceholder( t ) );
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
  getTasksForBoard$( board: Board, includeArchive: boolean = false ): Observable<Task[]>{
    return this._boards$.pipe(
      map( boards => {
        const b = boards.find( b => b.id === board.id );
        if( !b ){
          throw new Error( `Cannot find board with id ${board.id}` );
        }
        // get all lanes except the archive and static ones
        const lanes = b.children.filter( l => ( includeArchive || !l.isArchive ) && !isStatic( l ) );
        let tasks: Task[] = [];
        for( const lane of lanes ){
          const chilren = lane.children;
          for( const child of chilren ){
            // get all the descendants of the child except the placeholders and the archived ones, for the given priority
            tasks = tasks.concat( child ).concat( getDescendants( child ) as Task[] );
          }
        }
        return tasks.filter( c => !isPlaceholder( c ) && ( includeArchive || !isArchivedOrDiscarded( c ) ) );
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
    this._lastSelectedTask$.next( {lane, task} );
    this._selectedTasks$.next( cur );
  }
  addToSelection( lane: Lane, task: Task ){
    const cur = this._selectedTasks$.getValue() || [];
    if( cur?.find( t => t.id === task.id ) ){
      return;
    }
    cur?.push( task );
    this._lastSelectedTask$.next( {lane, task} );
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
  get lastSelectedTask$(): Observable<{lane: Lane, task:Task} | undefined>{
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
  get allTasks$(): Observable<Task[] | undefined>{
    return this._allTasks$;
  }
  get editorActiveTask$(): Observable<{ lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined>{
    return this._editorActiveTask$;
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
  get lastSelectedTask(): {lane: Lane, task:Task} | undefined{
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

  updateStatus( board: Board | undefined, container: Container, status: Status | Status[] | undefined ){
    status = status && Array.isArray( status ) ? status : ( status ? [status] : undefined );
    if( isLane( container ) ){
      container.status = status;
    }else{
      if( !status ){
        throw new Error( 'Cannot update status of a task to undefined' );
      }
      if( container.status ){
        if( !Array.isArray( container.status ) ){
          setDateSafe( container, container.status, 'leave', new Date() );

        }else{
          for( const s of container.status ){
            setDateSafe( container, s, 'leave', new Date() );
          }
        }
      }

      for( const s of status ){
        container.status = s;
        setDateSafe( container, s, 'enter', new Date() );
        /*
        if( isTask( container ) && board ){
          this.evaluateArchiveMove( board, container );
        }*/
      }

      // if the parent is a project, update its status accordingly:
      const p  = this.findDirectParent( [container] );
      if( isProject( p ) ){
        this.updateStatus( board, p, getProjectComputedStatus( p ) )
      }
    }
  }

  /**
  * Evaluates the move of a task to/from the archive lane.
  * Tasks get physically moved to the Archive lane for performance reasons
  */
  private evaluateArchiveMove( board: Board, task: Task ){
    let archive = board.children.find( l => l.isArchive );
    if( isArchived( task ) ){
      const parent = this.findDirectParent( [task] )
      if( parent && ( !isTask( parent ) || !parent.archivedDate ) ){ // if the parent is already archived, we do not want to remove the task
        task.parentId = parent.id;
        // Removal from the original parent
        parent.children = parent.children.filter( t => t.id !== task.id );
      }

      /*
      // task could be a recurrence child:
      const recurrenceParent = this.allTasks?.filter( t => isRecurringTask( t ) ).find( t => t.recurrences.map( r => r.id ).find( t => t === task.id ) );
      if( recurrenceParent ){
        task.parentId = recurrenceParent.id;
        recurrenceParent.recurrences = recurrenceParent.recurrences.filter( t => t.id !== task.id );
      }
      */
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
      const descendantsToRemove = getDescendants( task ).filter( t => isArchivedOrDiscarded( t as Task ) );
      descendantsToRemove.forEach( d => { archive!.children = archive!.children.filter( t => t.id !== d.id );
      } );

      // add the task to the archived lane
      archive.children.unshift( task );
    }else{
      // Check if it is a first level task in the archive
      if( !archive?.children.find( t => t.id === task.id ) ){
        // do not do anything
        // console.warn( `Task with id ${task.id} is not a first level task in the archive.` );
        return;
      }
      /*
      // if the task was a recurrence child, put it back on the parent
      if( isRecurringTaskChild( task ) ){
        const p = this._allTasks$.getValue()?.find( p => p.id === task.time!.fatherRecurringTaskId );
        if( p && isRecurringTask( p ) ){
          p.recurrences.push( task );
          p.recurrences.sort( ( r1, r2 ) => r1.gantt.recurringChildIndex - r2.gantt.recurringChildIndex )
        }
      }else{
      */
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
      //}
      delete task.archivedDate;
      // remove the task from the archive
      archive?.children.splice( archive.children.findIndex( t => t.id === task.id ), 1 );
    }
    // Finally, push the changes
    this.changePublisherService.processChangesAndPublishUpdate( [archive, task] )
  }

  //@TimingDecorator()
  getTaskInDirection( tasks: Task[] | undefined, parent: Lane, direction: 'up' | 'down' | 'left' | 'right' ): Task | undefined{
    logPerformance( "getTaskInDirection", true );

    if( !tasks || tasks.length === 0 ){
      return;
    }

    // get outer parent of the tasks
    //const parent = this.findParentLane( tasks );
    if( !parent ){
      throw new Error( "Cannot find parent for tasks "  + tasks.map( t => t.id ) )
    }
    // let taskToFind = this.getTopLevelTasks(tasks);
    // get all the tasks in the lane, including descendants, in an ordered array
    const orderedLinearizedTasks = getDescendants( parent ).filter( c => isTask( c ) ) as Task[];
    logPerformance( "getTaskInDirection" );

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
    logPerformance( "getTaskInDirection" );

    return orderedLinearizedTasks[direction === 'up' || direction === 'left' ? index - 1 : index + 1];
  }

  /**
     * Finds the direct parent container for the given objects.
     * This accounts for object including toSearch as children or as a recurrence
     */
  findDirectParent( toSearch: Container[] | undefined, includeArchive = false ): Container | undefined{
    if( !toSearch || toSearch.length === 0 ){
      return;
    }
    if( isTasks( toSearch ) ){
      toSearch = this.getTopLevelTasks( toSearch );
    }
    const toSearchIds = toSearch.map( s => s.id )

    let parents = this._allParents$.getValue()?.filter( p => 
      ( p.children.length > 0 && p.children.map( c => c.id ).filter( childId => toSearchIds.includes( childId ) ).length > 0 ) 
      //|| ( isRecurringTask( p ) && p.recurrences.length > 0 && p.recurrences.map( c => c.id ).filter( recId => toSearchIds.includes( recId ) ).length > 0 )
    );
    // filter out duplicate parents and archive
    if( parents ){
      // remove duplicates
      parents = parents?.filter( ( p, index ) => parents!.findIndex( p2 => p2.id === p.id ) === index );
      // remove archive
      parents = parents?.filter( p => !isLane( p ) || ( isLane( p ) && ( includeArchive || !p.isArchive ) ) );
    }

    if( !parents || parents.length === 0 ){
      console.debug( `Container ${toSearch.map( c => c.id )} has no parents (includeArchive = ${includeArchive})`, toSearch );
      return;
    }else if( parents?.length !== 1 ){
      console.error( `Container ${toSearch.map( c => c.id )} have multiple parents, this should never happen`, toSearch );
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
   * Returns all the parents for the object
   * @param obj 
   */
  findParents( obj: Container ): Container[]{
    const parents: Container[] = [];
    let parent = this.findDirectParent( [obj], false );
    while( parent ){
      parents.push( parent );
      parent = this.findDirectParent( [parent], true );
    }
    return parents;
  }

  findParentBoard( objs: Container[] | undefined ): Board | undefined{
    if( !objs || objs.length === 0 ){
      return;
    }
    
    let parent = this.findDirectParent( objs, true );

    while( parent != null ){
      const grandParent = this.findDirectParent( [parent], true );
      if( isBoard( parent ) ){
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
    //const boards = this._boards$.getValue();

    tasks = this.getTopLevelTasks( tasks );

    // Detect and resolve gantt link conflicts when moving to a new parent
    if( isTask( parent ) ){
      const conflicts = this.detectLinkConflicts( parent, tasks );
      if( conflicts.length > 0 ){
        const conflictedTasks = this.resolveGanttConflicts( conflicts );
        console.log( `Resolved ${conflicts.length} gantt conflicts when moving tasks as siblings` );
        
        // Update all affected tasks and their successors
        if( conflictedTasks.length > 0 ){
          const allAffected = this.cascadeGanttUpdates( conflictedTasks );
          this.changePublisherService.processChangesAndPublishUpdate( allAffected );
        }
      }
    }

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
    //this._boards$.next( boards );

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
    //const boards = this._boards$.getValue();

    // incoming tasks could be related one another. Keep only the top level tasks
    children = this.getTopLevelTasks( children );

    // Detect and resolve gantt link conflicts before moving tasks
    if( isTask( parent ) ){
      const conflicts = this.detectLinkConflicts( parent, children );
      if( conflicts.length > 0 ){
        const conflictedTasks = this.resolveGanttConflicts( conflicts );
        console.log( `Resolved ${conflicts.length} gantt conflicts when moving tasks` );
        
        // Update all affected tasks and their successors
        if( conflictedTasks.length > 0 ){
          const allAffected = this.cascadeGanttUpdates( conflictedTasks );
          this.changePublisherService.processChangesAndPublishUpdate( allAffected );
        }
      }
    }

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
    } );

    // Check if parent or any ancestor project has predecessors, and if so, make children rolling
    if( isTask( parent ) ){
      const hasProjectPredecessors = this.hasAncestorWithPredecessors( parent );
      if( hasProjectPredecessors ){
        children.forEach( child => {
          if( isTask( child ) ){
            this.convertTaskToRolling( child );
            // Also convert all descendants if it's a project
            if( isProject( child ) ){
              this.getAllProjectDescendants( child ).forEach( descendant => {
                this.convertTaskToRolling( descendant );
              } );
            }
          }
        } );
      }
    }

    // Publish the changes
    //this._boards$.next( boards );
  }

  //@TimingDecorator()
  switchPosition( selectedTasks: Task[] | undefined, direction: 'ArrowUp' | 'ArrowDown' ){
    logPerformance( "switchPosition", true );

    if( !selectedTasks || selectedTasks.length === 0 ){
      return;
    }

    /*
        if(selectedTasks.find( t => getDescendants(t).map( t => t.id ).find(id => id === nearby.id ) )){
            throw new Error(`Cannot switch position of a task with its descendants`);
        }*/
    selectedTasks = this.getTopLevelTasks( selectedTasks );
    logPerformance( "switchPosition" );

    const parent = this.findDirectParent( selectedTasks );
    logPerformance( "switchPosition" );

    if( !parent ){
      throw new Error( 'Cannot find parent of the selected tasks' );
    }
    const siblings = parent?.children as Task[] || [];

    const index = selectedTasks.map( sel => siblings.findIndex( s => s.id === sel.id ) ).sort( ( a, b ) => a - b )[0];

    // sort selected tasks basing on their order in the parent's children
    selectedTasks = selectedTasks.sort( ( a, b ) => siblings.findIndex( s => s.id === a.id ) - siblings.findIndex( s => s.id === b.id ) );

    if( direction === 'ArrowUp' && index > 0 ){
      parent.children.splice( index - 1, selectedTasks.length + 1, ...selectedTasks.concat( siblings[index - 1] ) );
    }else if( direction === 'ArrowDown' && index < siblings.length - 1 ){
      parent.children.splice( index, selectedTasks.length + 1, ...[siblings[index + selectedTasks.length]].concat( selectedTasks ) );
    }
    logPerformance( "switchPosition" );

    //this.publishBoardUpdate();
  }

  /**
   * Removes the children from the given parent, then finds the grandparent and adds them to its children
   * @param parent 
   * @param children 
   * @returns the grandparent
   */
  removeChildrenAndAddAsSibling( parent: Container, children: Task[] | undefined ): Container{
    if( !children || children.length === 0 ){
      throw new Error( `No children` )
    }
    //const boards = this._boards$.getValue();

    children = this.getTopLevelTasks( children );

    // sort children basing on their order in the parent's children
    children = children.sort( ( a, b ) => parent.children.findIndex( c => c.id === a.id ) - parent.children.findIndex( c => c.id === b.id ) );

    parent.children = parent.children.filter( c => !children.find( t => t.id === c.id ) );

    // task need to become sibling of the parent. Find the parent of the parent
    const grandParent = this.findDirectParent( [parent] );
    if( grandParent ){
      grandParent.children.splice( grandParent.children.findIndex( c => c.id === parent.id ) + 1, 0, ...children );
      //grandParent.children = grandParent.children.concat(children);
      return grandParent;
    }
    throw new Error( `Could not find grandparent for ${children.map( c => c.id )}` )
    // Publish the changes
    //this._boards$.next( boards );
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
  getAllTimedDescendants( tasks: Task[] ): Task[]{
    const allDescendantsHavingDates = tasks.flatMap( t => getDescendants( t ).concat( t ) ).filter( t => isTask( t ) ).filter( t => !isProject( t ) && isTimedTask( t ) );
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
    //this._boards$.next( boards );
  }
  deleteTask( task: Task ){
    //const boards = this._boards$.getValue();
    const parent = this.findDirectParent( [task] );
    if( !parent ){
      throw new Error( `Cannot find parent for task with id ${task.id}` );
    }
    parent.children = parent.children.filter( c => c.id !== task.id );
    //this._boards$.next( boards );
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
        children.splice( i, 0, getNewTask( lane, undefined, '', false ) );
        continue;
      }
      prevPriority = children[i].priority;
      i++;
    }

    lane.children = children;
    //this.publishBoardUpdate();
  }

  archiveDones( board: Board, lane: Lane ){
    // this._boards$.getValue();
    const descendants = getDescendants( lane );
    descendants.filter( t => isTask( t ) && !isPlaceholder( t ) && t.status === 'completed' )
      .forEach( d => {
        assertIsTask( d );
        d.archivedDate = toIsoString( new Date() );
        this.evaluateArchiveMove( board, d )
      } );
    /*
        lane.children = lane.children.filter(t => !t.archived);
        let descendants = getDescendants(lane);
        descendants.forEach(d => d.children = d.children.filter(t => !t.archived));
        */
    //this.publishBoardUpdate();
  }

  archive( board: Board, task: Task ){
    task.archivedDate = toIsoString( new Date() );
    this.evaluateArchiveMove( board, task )
    //this.publishBoardUpdate();
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
    //this.publishBoardUpdate();
  }
  moveToBoard( currentBoard: Board, lane:Lane, targetBoard: Board ){
    currentBoard.children = currentBoard.children.filter( c => c.id !== lane.id );
    targetBoard.children.unshift( lane );
    lane.parentId = targetBoard.id;
    //this.publishBoardUpdate();
  }
  
  /**
   * Returns tasks which has the task as predecessor.
   * If deep, returns all the subtree of linked tasks.
   * @param task 
   * @returns 
   */
  findSuccessors( task: Task, deep = false ): Task[]{
    let ret: Task[] = []
    const directChildren = this._allTasks$.getValue()?.filter( t => t.time?.predecessors?.map( t => t.taskId ).includes( task.id ) ) ?? [];
    ret = ret.concat( directChildren )
    if( deep ){
      directChildren.forEach( ( child ) => {
        const succ = this.findSuccessors( child, true );
        ret = ret.concat( succ );
      } )
    }
    return ret;
  }

  /**
 * Returns
 *  Computed start and end date for rolling tasks
 *  Start and end date for fixed tasks
 * @param t 
 * @returns 
 */
  getComputedTaskDates( t: TimedTask, durationInWorkingHours?: number ): {startDate: Date, endDate: Date}{
    if( isProject( t ) ){
      const d = getDescendants( t )
        .filter( d => isTimedTask( d ) )
        .flatMap( d => {
          const dates = this.getComputedTaskDates( d );
          return[dates.startDate, dates.endDate]
        } )
        .sort( ( d1, d2 ) => d2.getTime() - d1.getTime() )
      return{
        startDate: d[d.length-1],
        endDate: d[0]
      }

    }else if( isFixedTimedTask( t ) ){
      return{
        startDate: fromIsoString( t.time.startDate ),
        endDate: fromIsoString( t.time.endDate )
      }
    }else if( isRollingTimedTask( t ) ){
      // find the first fixes predecessor, and calculate from there:
      let predecessors = t.time.predecessors.map( p => this.findTask( p.taskId ) )

      let containingProject: Task | undefined = this.findTask( t.parentId );
      while( containingProject ){
        if( containingProject?.time?.predecessors ){
          predecessors = predecessors.concat( containingProject.time.predecessors.map( p => this.findTask( p.taskId ) ) );
        }
        containingProject= this.findTask( containingProject.parentId );
      }

      let greatestEndDateInPredecessors = predecessors
        
        .filter( p => !!p )
        .map( pred => {
          assertIsTimedTask( pred )
          return this.getComputedTaskDates( pred ).endDate;
               
        } ).filter( e => !!e ).sort( ( d1, d2 ) => d2.getTime() - d1.getTime() )[0]
      if( !greatestEndDateInPredecessors ){
        greatestEndDateInPredecessors = new Date();
      }
      const dates = snapToWorkDays( greatestEndDateInPredecessors, durationInWorkingHours ?? t.time.durationInWorkingHours );
      return{
        startDate: dates.startDate,
        endDate: dates.endDate
      }
    }

    throw new Error( "Task is neither fixed not rolling" )
  }

  updateTaskTimeDimension( task: Task, dimension: {startDate: Date, endDate: Date} | {durationInWorkingHours: number}, lane: Lane ){
    // find the task in the model
    const modelTask = task;

    // depending on the task type, update the task time data
    if( !modelTask.time ){
      initTimeData( modelTask, new Date() );
    }
    assertIsTimedTask( modelTask );

    if( 'durationInWorkingHours' in dimension ){
      // Handle the case where dimension is { durationInWorkingHours: number }
      if( isFixedTimedTask( modelTask ) ){
      // from gantt, we are receiving start_date and end_date. We use the data to update the task time data
        const snapped = snapToWorkDays( fromIsoString( modelTask.time.startDate ), dimension.durationInWorkingHours );
        modelTask.time.startDate = toIsoString( snapped.startDate );
        modelTask.time.endDate = toIsoString( snapped.endDate );
        modelTask.time.durationInWorkingHours = undefined;
      }else if( isRollingTimedTask( modelTask ) ){
        modelTask.time.durationInWorkingHours = dimension.durationInWorkingHours;
      }
    }else{
      if( isFixedTimedTask( modelTask ) ){
        const modelWorkingHours = calculateWorkingHours( dimension.startDate, dimension.endDate );
        const snapped = snapToWorkDays( dimension.startDate, modelWorkingHours.total );

        // from gantt, we are receiving start_date and end_date. We use the data to update the task time data
        modelTask.time.startDate = toIsoString( snapped.startDate );
        modelTask.time.endDate = toIsoString( snapped.endDate );
        modelTask.time.durationInWorkingHours = undefined;
      }else if( isRollingTimedTask( modelTask ) ){
        console.warn( "Setting dates on a rolling task" )
      }
    }
    // snap to work days if needed
    // commit the changes
    //this.changePublisherService.processChangesAndPublishUpdate( [modelTask, this.lane] );
    this.publishUpdateOnTaskAndSuccessorsAndContainers( modelTask, lane );
  }
  private publishUpdateOnTaskAndSuccessorsAndContainers( task: Task, lane: Lane ){
    const succ = this.findSuccessors( task, true );
    const parents = this.findParents( task ).filter( p => isTask( p ) );
    this.changePublisherService.processChangesAndPublishUpdate( [task, ...succ, ...parents, lane ] )
  }

  calculateWorkingHoursDuration( t:TimedTask | Project ): number{
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if( isProject( t ) ){
      const d = getDescendants( t )
        .filter( d => isTimedTask( d ) )
        .flatMap( d => {
          const dates = this.getComputedTaskDates( d );
          return[dates.startDate, dates.endDate]
        } )
        .sort( ( d1, d2 ) => d2.getTime() - d1.getTime() )
      startDate = d[d.length-1];
      endDate = d[0]
    }else if( isFixedTimedTask( t ) ){
      startDate = fromIsoString( t.time.startDate );
      endDate = fromIsoString( t.time.endDate );
  
    }else if( isRollingTimedTask( t ) ){
      const d = this.getComputedTaskDates( t );
      startDate = d.startDate;
      endDate = d.endDate
    }else{
      throw new Error( "Task is neither fixed not rolling" )
    }

    return calculateWorkingHours( startDate, endDate ).total
  }  

  /**
   * Compares all the tasks in the board for text similarities. If any similarity is found, tasks get linked.
   * @param board 
   */
  manageSimilaritiesInTasks( board: Board ): Container[]{
    const ret: Container[] = [];
    const start = new Date().getTime();
    const descendants: Task[] = getDescendants( board ).filter( d => isTask( d ) ).filter( d => !isArchivedOrDiscarded( d ) );
    const processed: Task[] = [];
    descendants.forEach( d => d.similarTasks = [] );
    for( const d of descendants ){
      for( const d2 of descendants.filter( v => v.id !== d.id && !processed.includes( v ) ) ){
        const sIndex = checkTaskSimilarity( d, d2 );
        if( sIndex >= similarityTreshold ){
          // console.log( `${stripHTML( d.textContent )} => ${stripHTML( d2.textContent )} = ${checkTaskSimilarity( d, d2 )}` );
          d.similarTasks.push( {id:d2.id, similarity: sIndex} );
          d2.similarTasks.push( {id:d.id, similarity: sIndex} );
          ret.push( d, d2 );
        }
      }
      processed.push( d )
    }
    console.warn( `Similarities check took ${ new Date().getTime() - start }ms` )
    return ret;
  }

  /**
   * Takes a recurrent task and manages its recurring children.
   * Keep the children in a 'todo' state to a certain threshold.
   * Discards 'todo' children in the past.
   * @param dateToCenter 
   * @param task 
   * @returns 

  manageRecurringChildren( task: RecurringTask ): RecurringTaskChild[]{
    const today = new Date();

    // Update status for children that are in the past and still in todo:
    task.recurrences.filter( c => {
      if( c.status === 'todo' && new Date( c.gantt.endDate ) < today ){
        return true;
      }
      return false;
    } ).forEach( c => c.discardedDate = toIsoString( new Date() ) )

    const recurrencesToConsider = task.recurrences.filter( t => t.status === 'todo' )

    if( recurrencesToConsider.length >= recurringChildrenLimit ){
      return task.recurrences
    }

    const latestTask = recurrencesToConsider.length > 0 ? recurrencesToConsider[recurrencesToConsider.length - 1] : task

    // dates to begin the calculation could be the original task dates or the latest task recurrence child
    const originalStartDate = new Date( latesttask.time.startDate );
    const originalEndDate = new Date( latesttask.time.endDate );

    let childStartDate = originalStartDate;
    let childEndDate = originalEndDate;

    let currentRecurringChildIndex = task.recurrences.length > 0 ? Math.max( ...task.recurrences.map( r => r.gantt.recurringChildIndex ) ) + 1 : 0

    const originalDatesInThePast = originalStartDate < today && originalEndDate < today;
    if( originalDatesInThePast ){
      // we need to find the first recurrence which has the end date in the future to display it as first recurrence:
      while( childEndDate < today ){
        childStartDate = shiftByRecurrence( childStartDate, task.time.recurrence );
        childEndDate = shiftByRecurrence( childEndDate, task.time.recurrence )
      }
    }else{
      childStartDate = shiftByRecurrence( childStartDate, task.time.recurrence );
      childEndDate =  shiftByRecurrence( childEndDate, task.time.recurrence );
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

      childStartDate = shiftByRecurrence( childStartDate, task.time.recurrence );
      childEndDate =  shiftByRecurrence( childEndDate, task.time.recurrence );
    }

    return task.recurrences

  }
  */
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
      const lane = getNewLane( board, false )
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
      this.populateDatamodelDerivedObservables( o.boards )
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

  /**
   * Checks if a task or any of its ancestor projects has predecessors
   */
  hasAncestorWithPredecessors( task: Task ): boolean{
    // Check if the task itself has predecessors
    if( task.time?.predecessors && task.time.predecessors.length > 0 ){
      return true;
    }

    // Walk up the hierarchy to check parent projects
    let currentParent: Task | undefined = this.findTask( task.parentId );
    while( currentParent && isTask( currentParent ) ){
      if( currentParent.time?.predecessors && currentParent.time.predecessors.length > 0 ){
        return true;
      }
      currentParent = this.findTask( currentParent.parentId );
    }

    return false;
  }

  /**
   * Converts a fixed task to rolling, preserving duration and other properties
   */
  convertTaskToRolling( task: Task ): void{
    if( !task.time ){
      initTimeData( task, new Date() );
    }
    
    assertIsTimedTask( task );
    
    if( isFixedTimedTask( task ) ){
      const currentDuration = task.time.startDate && task.time.endDate ? 
        calculateWorkingHours( fromIsoString( task.time.startDate ), fromIsoString( task.time.endDate ) ).total : 
        8; // default 8 hours if no duration

      // Convert to rolling by recreating the time object
      const rollingTime = {
        startDate: undefined,
        endDate: undefined,
        durationInWorkingHours: currentDuration,
        resourcesAllocation: task.time.resourcesAllocation,
        progress: task.time.progress,
        type: 'rolling' as const,
        predecessors: task.time.predecessors || []
      };
      ( task as TimedTask ).time = rollingTime;
    }else if( isRollingTimedTask( task ) ){
      // Already rolling, preserve current duration
      task.time.durationInWorkingHours = task.time.durationInWorkingHours || 8;
    }
  }

  /**
   * Gets all descendant tasks of a project recursively
   */
  getAllProjectDescendants( project: Task ): Task[]{
    const descendants: Task[] = [];
    
    project.children.forEach( child => {
      if( isTask( child ) ){
        descendants.push( child );
        if( isProject( child ) ){
          descendants.push( ...this.getAllProjectDescendants( child ) );
        }
      }
    } );
    
    return descendants;
  }

  /**
   * Handles cascading updates when tasks change their rolling/fixed status
   * Updates all successors that may be affected by the change
   */
  cascadeGanttUpdates( affectedTasks: Task[] ): Task[]{
    const allAffected = new Set<Task>( affectedTasks );
    
    // For each affected task, find its successors and add them to the update list
    affectedTasks.forEach( task => {
      const successors = this.findSuccessors( task, true );
      successors.forEach( successor => allAffected.add( successor ) );
      
      // Also add parent projects as they may need date recalculation
      const parents = this.findParents( task ).filter( p => isTask( p ) );
      parents.forEach( parent => allAffected.add( parent as Task ) );
    } );
    
    return Array.from( allAffected );
  }

  /**
   * Detects if moving tasks as children would create circular dependencies
   * Returns the conflicting predecessor relationships that need to be removed
   */
  detectLinkConflicts( parent: Task, children: Task[] ): { taskId: string, linkId: string, conflictReason: string }[]{
    const conflicts: { taskId: string, linkId: string, conflictReason: string }[] = [];
    
    // Get all ancestors of the parent (where the children will be moved)
    const parentAncestors = this.getTaskAncestors( parent );
    
    children.forEach( child => {
      if( !child.time?.predecessors )return;
      
      child.time.predecessors.forEach( pred => {
        const predecessorTask = this.findTask( pred.taskId );
        if( !predecessorTask )return;
        
        // Check if the predecessor is the new parent or any of its ancestors
        if( predecessorTask.id === parent.id ){
          conflicts.push( {
            taskId: child.id,
            linkId: pred.linkId,
            conflictReason: `Task ${child.id} cannot be a child of its predecessor ${parent.id}`
          } );
        }else if( parentAncestors.some( ancestor => ancestor.id === predecessorTask.id ) ){
          conflicts.push( {
            taskId: child.id,
            linkId: pred.linkId,
            conflictReason: `Task ${child.id} cannot be a descendant of its predecessor ${predecessorTask.id}`
          } );
        }
        
        // Check if the predecessor is a descendant of any of the children being moved
        const childDescendants = this.getAllProjectDescendants( child );
        if( childDescendants.some( desc => desc.id === predecessorTask.id ) ){
          conflicts.push( {
            taskId: child.id,
            linkId: pred.linkId,
            conflictReason: `Task ${child.id} has predecessor ${predecessorTask.id} which is its descendant`
          } );
        }
      } );
      
      // Also check if any descendants of the child have conflicting predecessors
      this.getAllProjectDescendants( child ).forEach( descendant => {
        if( !descendant.time?.predecessors )return;
        
        descendant.time.predecessors.forEach( pred => {
          const predecessorTask = this.findTask( pred.taskId );
          if( !predecessorTask )return;
          
          if( predecessorTask.id === parent.id || parentAncestors.some( ancestor => ancestor.id === predecessorTask.id ) ){
            conflicts.push( {
              taskId: descendant.id,
              linkId: pred.linkId,
              conflictReason: `Descendant ${descendant.id} cannot have predecessor ${predecessorTask.id} when moved under ${parent.id}`
            } );
          }
        } );
      } );
    } );
    
    return conflicts;
  }

  /**
   * Gets all ancestors of a task (parent, grandparent, etc.)
   */
  getTaskAncestors( task: Task ): Task[]{
    const ancestors: Task[] = [];
    let currentParent = this.findTask( task.parentId );
    
    while( currentParent && isTask( currentParent ) ){
      ancestors.push( currentParent );
      currentParent = this.findTask( currentParent.parentId );
    }
    
    return ancestors;
  }

  /**
   * Removes conflicting predecessor links to prevent circular dependencies
   */
  resolveGanttConflicts( conflicts: { taskId: string, linkId: string, conflictReason: string }[] ): Task[]{
    const affectedTasks: Task[] = [];
    
    conflicts.forEach( conflict => {
      const task = this.findTask( conflict.taskId );
      if( !task?.time?.predecessors )return;
      
      // Remove the conflicting predecessor
      const originalPredCount = task.time.predecessors.length;
      task.time.predecessors = task.time.predecessors.filter( p => p.linkId !== conflict.linkId );
      
      if( task.time.predecessors.length < originalPredCount ){
        console.warn( `Removed conflicting link: ${conflict.conflictReason}` );
        affectedTasks.push( task );
        
        // If task has no more predecessors and is rolling, convert back to fixed
        if( task.time.predecessors.length === 0 && isRollingTimedTask( task ) && !this.hasAncestorWithPredecessors( task ) ){
          this.convertRollingToFixed( task );
        }
      }
    } );
    
    return affectedTasks;
  }

  /**
   * Converts a rolling task back to fixed
   */
  convertRollingToFixed( task: Task ): void{
    if( !isRollingTimedTask( task ) )return;
    
    const workingHours = task.time.durationInWorkingHours;
    const dates = this.getComputedTaskDates( task, workingHours );
    
    const fixedTime = {
      startDate: toIsoString( dates.startDate ),
      endDate: toIsoString( dates.endDate ),
      durationInWorkingHours: undefined,
      resourcesAllocation: task.time.resourcesAllocation,
      progress: task.time.progress,
      type: 'fixed' as const,
      predecessors: task.time.predecessors || []
    };
    ( task as TimedTask ).time = fixedTime;
  }

  /**
   * Checks if a task is a nested project (a project that has a parent project)
   */
  isNestedProject( task: Task ): boolean{
    if( !isProject( task ) )return false;
    
    // Check if any ancestor is also a project
    const ancestors = this.getTaskAncestors( task );
    return ancestors.some( ancestor => isProject( ancestor ) );
  }

  /**
   * Checks if two projects are siblings (have the same direct parent)
   */
  areSiblingProjects( project1: Task, project2: Task ): boolean{
    if( !isProject( project1 ) || !isProject( project2 ) )return false;
    
    // Both must have the same parent
    return project1.parentId === project2.parentId;
  }

  /**
   * Validates if a gantt link can be created between source and target tasks
   */
  validateGanttLink( source: Task, target: Task ): { valid: boolean, reason?: string }{
    // Check if both are projects
    const bothAreProjects = isProject( source ) && isProject( target );
    
    if( bothAreProjects ){
      // Allow sibling projects to be linked
      if( this.areSiblingProjects( source, target ) ){
        // Sibling projects are allowed to link
      }else if( this.isNestedProject( target ) || this.isNestedProject( source ) ){
        // One or both are nested projects and they're not siblings
        return{
          valid: false,
          reason: `Cannot create links between nested projects that are not siblings. "${source.textContent}" and "${target.textContent}" must be at the same level.`
        };
      }
    }else{
      // Handle cases where only one is a project
      // Prevent linking to nested projects
      if( isProject( target ) && this.isNestedProject( target ) ){
        return{
          valid: false,
          reason: `Cannot create predecessor link to nested project "${target.textContent}". Links to projects within other projects are not supported.`
        };
      }

      // Prevent linking from nested projects  
      if( isProject( source ) && this.isNestedProject( source ) ){
        return{
          valid: false,
          reason: `Cannot create predecessor link from nested project "${source.textContent}". Links from projects within other projects are not supported.`
        };
      }
    }

    // Prevent circular dependencies
    const sourceAncestors = this.getTaskAncestors( source );
    const targetAncestors = this.getTaskAncestors( target );
    
    if( sourceAncestors.some( ancestor => ancestor.id === target.id ) ){
      return{
        valid: false,
        reason: `Cannot create link: "${source.textContent}" is already a descendant of "${target.textContent}".`
      };
    }

    if( targetAncestors.some( ancestor => ancestor.id === source.id ) ){
      return{
        valid: false,
        reason: `Cannot create link: "${target.textContent}" is already a descendant of "${source.textContent}".`
      };
    }

    // Check if target already has this source as predecessor
    if( target.time?.predecessors?.some( pred => pred.taskId === source.id ) ){
      return{
        valid: false,
        reason: `Link already exists between "${source.textContent}" and "${target.textContent}".`
      };
    }

    return{ valid: true };
  }
}
