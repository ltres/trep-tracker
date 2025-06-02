import{ Injectable }from'@angular/core';

import{ BehaviorSubject, Observable }from'rxjs';
import{ BoardService }from'./board.service';
import{ ContainerComponentRegistryService }from'./registry.service';
import{ Container, Lane, Task, getNewTask }from'../types/types';
import{ getCaretPosition, isPlaceholder, initTimeData }from'../utils/utils';
import{ isLane, isTask }from'../utils/guards';
import{ logPerformance }from'../utils/performance-logger';
import{ ChangePublisherService }from'./change-publisher.service';

@Injectable( {
  providedIn: 'root',
} )
export class KeyboardService{
  _keyboardEvent$: BehaviorSubject<KeyboardEvent | undefined> = new BehaviorSubject<KeyboardEvent | undefined>( undefined );

  /**
   * On Mac, meta key is CMD, while on WIN/UNIX is CTRL
   */
  isMetaKeyPressed( e: KeyboardEvent | undefined ):boolean{
    return e?.ctrlKey || e?.metaKey || false
  }

  constructor(
    protected changePublisherService: ChangePublisherService,
    private boardService: BoardService,
    private registry: ContainerComponentRegistryService,
  ){
    this._keyboardEvent$.subscribe( e => {
      if( e?.type != 'keydown' || !e || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Delete', 'Shift', 'd', 'a', 'f'].indexOf( e.key ) === -1 ){
        return;
      }
      const res = this.getLastSelectedTaskData();
      if( !res ){
        return
      }
      /*
      if(e.key === 'd' && isMetaKeyPressed(e)){
        // Mark as Done selected tasks
        e.preventDefault();
        this.boardService.selectedTasks?.filter(t => !isPlaceholder(t) ).forEach(t => this.boardService.nextStatus(t) );
      }else if(e.key === 'a' && isMetaKeyPressed(e)){
        // Archive tasks
        let board = this.boardService.selectedBoard;
        if(!board)return;
        e.preventDefault();
        this.boardService.selectedTasks?.filter(t => !isPlaceholder(t) ).forEach(t => this.boardService.evaluateArchiveMove(board,t) );
      }else */
      if( e.key === 'f' && this.isMetaKeyPressed( e ) ){
        // Focus search input
        this.boardService.focusSearch();
      }else if( e.key === 'ArrowDown' || e.key === 'ArrowUp' ){
        logPerformance( "moveTask", true );
        const caretPos = res.caretPos
        const nearby = e?.key === 'ArrowDown' ? this.boardService.getTaskInDirection( this.boardService.selectedTasks, res.lane, 'down' ) : this.boardService.getTaskInDirection( this.boardService.selectedTasks, res.lane, 'up' );
        if( !nearby ){
          return;
        }
        const lane = res.lane; //this.boardService.findParentLane( [nearby] );
        if( !lane ){
          return;
        }
        if( e.shiftKey === true ){
          if( this.isMetaKeyPressed( e ) ){
            // Move case
            this.boardService.switchPosition( this.boardService.selectedTasks, e.key );
          }else{
            // Select multiple case
            this.boardService.activateEditorOnTask( lane, nearby, caretPos );
            this.boardService.addToSelection( lane, nearby );
          }
          this.changePublisherService.processChangesAndPublishUpdate( [lane, nearby, ...this.boardService.selectedTasks ?? [] ] )
        }else{
          // Select next/previous case
          this.boardService.activateEditorOnTask( lane, nearby, caretPos );
          this.boardService.clearSelectedTasks();
          this.boardService.addToSelection( lane, nearby );
        }
        logPerformance( "moveTask" );
      }else if( e.key === 'ArrowRight' && this.isMetaKeyPressed( e ) ){
        // Make this task a child of the task on the top
        const wannaBeParent = this.boardService.getTaskInDirection( this.boardService.selectedTasks, res.lane, 'up' );
        if( !wannaBeParent ){
          throw new Error( 'Cannot find nearby task' );
        }
        this.boardService.addAsChild( wannaBeParent, this.boardService.selectedTasks );
        this.changePublisherService.processChangesAndPublishUpdate( [res.lane, wannaBeParent] )
      }else if( e.key === 'ArrowLeft' && this.isMetaKeyPressed( e ) ){
        // Children task gets promoted to the same level as the parent
        const parent = this.boardService.findDirectParent( this.boardService.selectedTasks );
        if( !parent ){
          throw new Error( 'Cannot find parent task' );
        }
        if( isLane( parent ) ){
          return;
        }
        const newParent = this.boardService.removeChildrenAndAddAsSibling( parent, this.boardService.selectedTasks );
        this.changePublisherService.processChangesAndPublishUpdate( [res.lane, parent, newParent] )
      }else if( e.key === 'Enter' ){
        const t = e.target as HTMLElement;
        if( t && !t.classList.contains( 'task-text-content' ) ){
          return;
        }
        // Create new task
        const res = this.getLastSelectedTaskData();
        if( !res ){
          return
        }
        const caretPos = res.caretPos

        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        // Create a new task
        /*
        if(!e.ctrlKey || !e.shiftKey){
          return;
        }*/
        let parentObject = this.boardService.findDirectParent( this.boardService.selectedTasks );
        let sibling: Container | undefined = this.boardService.lastSelectedTask?.task;
        
        // If the current task belongs to a project, create sibling within the project
        if( parentObject && isTask( parentObject ) ){
          // Current task is a child of another task (project)
          // Create new task as sibling within this project
          sibling = this.boardService.lastSelectedTask?.task;
        }else{
          // Current task is at lane level, traverse up to find lane
          while( parentObject && !isLane( parentObject ) ){
            sibling = parentObject;
            parentObject = this.boardService.findDirectParent( [parentObject] );
          }
        }
        
        if( !parentObject || ( !isLane( parentObject ) && !isTask( parentObject ) ) || !isTask( sibling ) ){
          throw new Error( 'Wrong parent or sibling' );
        }
        
        // Create new task with correct parent
        const task = isLane( parentObject ) 
          ? getNewTask( parentObject, undefined, '', false )
          : getNewTask( parentObject.id, undefined, '', false );
        /*
        let lane = isLane(parent) ? parent : this.boardService.findParentLane([parent]);
        if (!lane) {
          return;
        }*/

        this.boardService.addAsSiblings( parentObject, sibling, [task], !isPlaceholder( task ) && caretPos === 0 ? 'before' : 'after' );
        
        // If we're in a project context, create an end-to-start relation between original and new task
        if( isTask( parentObject ) && sibling ){
          const insertBefore = !isPlaceholder( task ) && caretPos === 0;
          if( insertBefore ){
            // New task is inserted before current task, so current task depends on new task
            this.createProjectSequenceLink( task, sibling );
          }else{
            // New task is inserted after current task, so new task depends on current task
            this.createProjectSequenceLink( sibling, task );
          }
        }
        
        // Find the actual lane for editor activation and selection
        const actualLane = isLane( parentObject ) ? parentObject : this.boardService.findParentLane( [task] );
        if( !actualLane ){
          throw new Error( 'Cannot find parent lane for new task' );
        }
        
        this.boardService.activateEditorOnTask( actualLane, task, 0 );
        this.boardService.clearSelectedTasks();
        this.boardService.addToSelection( actualLane, task );
      }else if( e.key === 'Backspace' || e.key === 'Delete' ){
        // Delete placeholder
        const res = this.getLastSelectedTaskData();
        if( !res ){
          return
        }
        const task = res.task
        if( isPlaceholder( task ) ){
          const bottomTask = this.boardService.getTaskInDirection( this.boardService.selectedTasks, res.lane, e.key === 'Delete' ? 'down' : 'up' );

          const lane = res.lane; //this.boardService.findParentLane( [nearby] );
          if( !lane ){
            return;
          }
          this.boardService.deleteTask( task );
          this.boardService.clearSelectedTasks();

          if( bottomTask ){
            this.boardService.activateEditorOnTask( lane, bottomTask, 0 );
            this.boardService.addToSelection( lane, bottomTask );
          }
        }
      }
    } );
  }

  private getLastSelectedTaskData(): {task: Task, lane: Lane, el: Node | undefined, caretPos: number} | undefined{
    const task = this.boardService.lastSelectedTask?.task;
    if( !task || !this.boardService.lastSelectedTask?.lane ){
      return undefined
    }
    let el: Node | undefined;
    this.registry.droppableDirectiveRegistry.forEach( c => {
      if( c.container && c.container.id === task.id && c.container._type === task._type ){
        el = c.el.nativeElement;
      }
    } );
    let caretPos = 0;
    if( el ){
      caretPos = getCaretPosition( el );
    }
    return{
      task, lane: this.boardService.lastSelectedTask.lane, el, caretPos,
    };

  }

  /**
   * Creates an end-to-start link between two tasks within a project
   */
  private createProjectSequenceLink( sourceTask: Task, targetTask: Task ): void{
    // Ensure both tasks have time data
    if( !sourceTask.time ){
      initTimeData( sourceTask, new Date() );
    }
    if( !targetTask.time ){
      initTimeData( targetTask, new Date() );
    }

    // Generate a unique link ID
    const linkId = `link_${sourceTask.id}_${targetTask.id}`;

    // Add the predecessor relationship
    targetTask.time!.predecessors.push( {
      taskId: sourceTask.id,
      linkId: linkId
    } );

    // Convert the target task to rolling since it now has a predecessor
    this.boardService.convertTaskToRolling( targetTask );

    // Trigger updates for both tasks and their successors
    const allAffected = this.boardService.cascadeGanttUpdates( [sourceTask, targetTask] );
    this.changePublisherService.processChangesAndPublishUpdate( allAffected );

    console.log( `Created automatic sequence link: ${sourceTask.textContent} → ${targetTask.textContent}` );
  }

  publishKeyboardEvent( event: KeyboardEvent | undefined ){
    this._keyboardEvent$.next( event );
  }

  get keyboardEvent$(): Observable<KeyboardEvent | undefined>{
    return this._keyboardEvent$;
  }

}
