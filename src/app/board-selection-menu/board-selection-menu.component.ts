import{ Component }from'@angular/core';
import{ BoardService }from'../../service/board.service';
import{ Board, Priority }from'../../types/types';
import{ Observable }from'rxjs';
import{ priorityValues }from'../../types/constants';
import{ ChangePublisherService }from'../../service/change-publisher.service';

@Component( {
  selector: 'board-selection-menu',

  templateUrl: './board-selection-menu.component.html',
  styleUrl: './board-selection-menu.component.scss',
} )
export class BoardSelectionMenuComponent{

  availablePriorities: readonly Priority[] = priorityValues;
  open: boolean = true;

  constructor( 
    protected boardService: BoardService,
    protected changePublisherService: ChangePublisherService
  ){}

  addBoard(){
    this.boardService.addNewBoard();
    this.changePublisherService.processChangesAndPublishUpdate( [] );
  }
  selectBoard( board: Board ){
    this.boardService.setSelectedBoard( board );
  }

  getTaskCount( board: Board, priority: Priority ): Observable<number>{
    return this.boardService.getTasksHavingPriorityCount$( board, priority );
  }

}
