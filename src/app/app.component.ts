import{ AfterViewInit, ApplicationRef, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject }from'@angular/core';

import{ BoardService }from'../service/board.service';
import{ AddFloatingLaneParams, Container, Lane }from'../types/types';
import{ ModalService }from'../service/modal.service';
import{ StorageServiceAbstract }from'../types/storage';
import{ isLane, isTask }from'../utils/guards';

@Component( {
  selector: 'app-root',
  //standalone: true,
  //imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
} )
export class AppComponent implements AfterViewInit{
  title = 'trep-tracker';
  constructor(
    protected boardService: BoardService,
    protected modalService: ModalService,
    @Inject( 'StorageServiceAbstract' ) protected storageService: StorageServiceAbstract,
    protected cdr: ChangeDetectorRef,
    private appRef: ApplicationRef,
  ){ }

  receiveDrop( container: Container, event?: DragEvent ){
    const board = this.boardService.selectedBoard;
    if( !board ){
      return;
    }
    if( isLane( container ) ){
      // Nothing to do
    }else if( isTask( container ) ){
      const params: AddFloatingLaneParams ={
        board: board, 
        x:( event?.clientX ) ?? 0, 
        y:( event?.clientY ) ?? 0, 
        children: [container], 
        archive:false, 
        width:300
      }
      this.boardService.addFloatingLane( params );
    }else{
      throw new Error( "Object not droppable on board" )
    }
  };

  ngAfterViewInit(): void{
    this.cdr.detectChanges()
  }

  getFirstLane(): Lane | undefined{
    const board = this.boardService.selectedBoard;
    return board?.children.find( child => child.tags.length === 0 );
  }

  isStatusPresent(){
    return this.storageService.isStatusPresent();
  }

}
