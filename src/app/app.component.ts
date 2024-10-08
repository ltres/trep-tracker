import{ AfterViewInit, ApplicationRef, Component, Inject }from'@angular/core';

import{ BoardService }from'../service/board.service';
import{ Observable }from'rxjs';
import{ AddFloatingLaneParams, Board, Container, Lane }from'../types/types';
import{ ModalService }from'../service/modal.service';
import{ StorageServiceAbstract }from'../types/storage';
import{ isLane, isTask }from'../utils/guards';

@Component( {
  selector: 'app-root',
  //standalone: true,
  //imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
} )
export class AppComponent implements AfterViewInit{
  title = 'trep-tracker';
  board!: Board;
  displayModal = false;
  constructor(
    private boardService: BoardService,
    protected modalService: ModalService,
    @Inject( 'StorageServiceAbstract' ) protected storageService: StorageServiceAbstract,
    private appRef: ApplicationRef,
  ){ }

  receiveDrop( container: Container, event?: DragEvent ){
    if( isLane( container ) ){
      // Nothing to do
    }else if( isTask( container ) ){
      const params: AddFloatingLaneParams ={
        board: this.board, 
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
    this.boardService.selectedBoard$.subscribe( board => {
      setTimeout( () => { 
        if( !board )return; 
        this.board = board; 
      } );
      //this.board = board
    } );
    this.modalService.displayModal$.subscribe( display => {
      setTimeout( () => { this.displayModal = display.show; } );
    } );
  }

  getFirstLane(): Lane | undefined{
    return this.board?.children.find( child => child.tags.length === 0 );
  }

  get boards$(): Observable<Board[]>{
    return this.boardService.boards$;
  }

  isStatusPresent(){
    return this.storageService.isStatusPresent();
  }

}
