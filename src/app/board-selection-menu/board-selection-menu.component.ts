import { AfterContentChecked, AfterViewInit, Component } from '@angular/core';
import { BoardService } from '../../service/board.service';
import { Board } from '../../types/task';

@Component({
  selector: 'board-selection-menu',

  templateUrl: './board-selection-menu.component.html',
  styleUrl: './board-selection-menu.component.scss'
})
export class BoardSelectionMenuComponent implements AfterViewInit{

  boards: Board[] | undefined

  constructor(protected boardService: BoardService) {
    
  }
  ngAfterViewInit(): void {
    this.boardService.boards$.subscribe(boards => {
      setTimeout(() =>{
        this.boards = boards
      })
    })
  }
  addBoard() {
    this.boardService.addNewBoard();
  }
  selectBoard(board: Board) {
    this.boardService.setSelectedBoard(board);
  }
    

}
