import{ Injectable, Injector }from"@angular/core";
import{ Board, Container, Lane, Task }from"../types/types";
import{ BoardService }from"./board.service";
import{ Observable, Subject }from"rxjs";
import{ isBoard, isLane, isProject, isRecurringTask, isRecurringTaskChild, isTask }from"../utils/guards";
import{ getDescendants, getProjectComputedStatus, isArchivedOrDiscarded, isPlaceholder }from"../utils/utils";
import{ TagService }from"./tag.service";

@Injectable( {
  providedIn: 'root',
} )
export class ChangePublisherService{

  private _pushedChanges$: Subject<Container[]> = new Subject<Container[]>();
  private boardService!: BoardService
  private tagService!: TagService

  constructor( 
    private injector: Injector
  ){
    setTimeout( () => this.boardService = injector.get( BoardService ) );
    setTimeout( () => this.tagService = injector.get( TagService ) );

  }

  processChangesAndPublishUpdate( changesToPush: Container[], skipProcessing = false ){

    if( !skipProcessing ){
    // Update parent references (except for children of archive lane)
      changesToPush.filter( p => !isLane( p ) || !p.isArchive ).forEach( p => p.children.forEach( c => c.parentId = p.id ) )

      for( const container of changesToPush ){
        if( isBoard( container ) ){
          this.processBoard( container, changesToPush );
        }else if( isLane( container ) ){
          this.processLane( container, changesToPush )
        }else if( isTask( container ) ){
          this.processTask( container, changesToPush )
        }
        // remove duplicates
        changesToPush = [...new Set( changesToPush )];
      }
    }
    this._pushedChanges$.next( changesToPush );
  }

  get pushedChanges$(): Observable<Container[]>{
    return this._pushedChanges$;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private processBoard( board: Board, changesToPush: Container[] ){

  }

  private processLane( lane: Lane, changesToPush: Container[] ){
    if( !lane.isArchive ){
      getDescendants( lane ).filter( c => isTask( c ) ).filter( c => c.archivedDate ).forEach( c => {
        // tasks that were dragged out of the archive lane for some reason
        delete c.archivedDate;
        changesToPush.push( c )
      } ); 
    }
  }

  private processTask( task: Task, changesToPush: Container[] ){
    // recurring child management:
    if( isRecurringTask( task ) && !isArchivedOrDiscarded( task ) && !isPlaceholder( task ) ){
      const children = this.boardService.manageRecurringChildren( task );
      changesToPush.push( ...children );
    }else if( isRecurringTaskChild( task ) && !isArchivedOrDiscarded( task ) && !isPlaceholder( task ) ){
      const p = this.boardService.findDirectParent( [task] );
      if( p && isRecurringTask( p ) ){
        const children = this.boardService.manageRecurringChildren( p );
        changesToPush.push( ...children );
      }

    }

    // Update project states
    if( isProject( task ) && !isArchivedOrDiscarded( task ) ){
      const computedStatus = getProjectComputedStatus( task );
      if( computedStatus !== task.status ){
        task.beforeProjectStatus = task.status
        this.boardService.updateStatus( undefined, task, computedStatus );
      }
    }

    // Update ex-project status
    if( !isProject( task ) && task.beforeProjectStatus && task.beforeProjectStatus !== task.status ){
      this.boardService.updateStatus( undefined, task, task.beforeProjectStatus );
      delete task.beforeProjectStatus
    }

    if( this.tagService && this.tagService.latestEditedTagsContainer && this.boardService.selectedBoard ){
      const toProcess = this.tagService.restructureTags( this.tagService.latestEditedTagsContainer, this.boardService.selectedBoard );
      changesToPush.push( ...toProcess );
    }

  }
}