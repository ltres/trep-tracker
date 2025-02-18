import{ Injectable }from'@angular/core';
import{ Observable, Subject }from'rxjs';
import{ BoardService }from'./board.service';
import{ ContainerComponentRegistryService }from'./registry.service';
import{ ContainerComponent }from'../app/base/base.component';
import{ Board, Container }from'../types/types';
import{ ChangePublisherService }from'./change-publisher.service';

@Injectable( {
  providedIn: 'root',
} )
export class DragService{

  private _dragEndEvent$: Subject<{
        dragged: Container,
        component: ContainerComponent,
        event: DragEvent,
        deltaX: number,
        deltaY: number,
        board: Board
    }>
    = new Subject();
  
  private _dragStartEvent$:Subject<Container> = new Subject<Container>();
  private _dragChecksEnded$:Subject<boolean> = new Subject<boolean>();
  private _draggingCoordinates$:Subject<{x:number, y:number, c:Container}> = new Subject<{x:number, y:number, c:Container}>();

  constructor(
    protected changePublisherService: ChangePublisherService,
    private boardService: BoardService,
    private registryService: ContainerComponentRegistryService,
  ){
    this._dragEndEvent$.subscribe( event => {
      const draggedObject = event.dragged;
      const{clientX:x, clientY:y } = event.event

      // look for overlapped component in the registry
      const overlappedDroppable = this.registryService.getDroppablessAtCoordinates( x, y ).filter( c => c.container !== draggedObject );
      if( !overlappedDroppable || overlappedDroppable.length === 0 ){
        console.warn( 'No overlapped droppable found' );
      }else{
        // Overlap case:
        // execute on first of stack
        if( overlappedDroppable[0].canBeDroppedHere( draggedObject ) ){
          overlappedDroppable[0].executeOnDropReceived( draggedObject, event.event );
          this.changePublisherService.processChangesAndPublishUpdate( [overlappedDroppable[0].container, draggedObject] )
        }else{
          console.warn( "Faulty drop" )
        }
      }
      this._dragChecksEnded$.next( true )
      
    } );
  }

  publishDragEndEvent( dragged: Container, component: ContainerComponent, event: DragEvent, deltaX: number, deltaY: number, board: Board ){
    this._dragEndEvent$.next( { dragged, component, event, deltaX, deltaY, board } );
  }
  publishDragStartEvent( dragged: Container ){
    this._dragStartEvent$.next( dragged );
  }
  publishDraggingCoordinates( x:number, y:number, c:Container ){
    this._draggingCoordinates$.next( {x, y, c} );
  }

  get dragEndEvent$(): Observable<{ dragged: Container, event: DragEvent } | undefined>{
    return this._dragEndEvent$;
  }

  get dragStartEvent$(): Observable<Container>{
    return this._dragStartEvent$;
  }

  get dragChecksEnded$(): Observable<boolean>{
    return this._dragChecksEnded$;
  }

  get draggingCoodinates$(): Observable<{x:number, y:number, c:Container}>{
    return this._draggingCoordinates$;
  }
}
