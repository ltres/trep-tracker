import{ AfterContentInit, Component }from'@angular/core';
import{ BoardService }from'../../service/board.service';
import{ Board, Priority }from'../../types/types';
import{ Observable }from'rxjs';
import{ priorityValues }from'../../types/constants';

@Component( {
  selector: 'board-selection-menu',

  templateUrl: './board-selection-menu.component.html',
  styleUrl: './board-selection-menu.component.scss',
} )
export class BoardSelectionMenuComponent implements AfterContentInit{

  boards: Board[] | undefined;
  availablePriorities: readonly Priority[] = priorityValues;

  open: boolean = true;

  constructor( protected boardService: BoardService ){}

  ngAfterContentInit(): void{
    this.boardService.boards$.subscribe( boards => {
      setTimeout( () => { this.boards = boards; } );
    } );
  }
  addBoard(){
    this.boardService.addNewBoard();
  }
  selectBoard( board: Board ){
    this.boardService.setSelectedBoard( board );
  }

  getTaskCount( board: Board, priority: Priority ): Observable<number>{
    return this.boardService.getTasksHavingPriorityCount$( board,priority );
  }

}
