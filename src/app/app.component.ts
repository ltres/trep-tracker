import { AfterViewInit, Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BoardComponent } from './board/board.component';
import { BoardService } from '../service/board.service';
import { Observable } from 'rxjs';
import { Board, getNewBoard, getNewLane } from '../types/task';
import { generateUUID } from '../utils/utils';

@Component({
  selector: 'app-root',
  //standalone: true,
  //imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {

  title = 'trep-tracker';
  board: Board | undefined
  constructor(private boardService: BoardService) {

  }

  ngAfterViewInit(): void {
    if(this.boardService.boards.length === 0) {
      this.addNewBoard()
    }
    this.boardService.selectFirstBoard();
    this.boardService.selectedBoard$.subscribe(board => {
      this.board = board
    })
  }

  reset(){
    this.boardService.reset();
    this.addNewBoard()
  }

  addNewBoard() {
    this.boardService.addNewBoard()
  }

  get boards$(): Observable<Board[]> {
    return this.boardService.boards$;
  }

}
