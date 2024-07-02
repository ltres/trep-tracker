import { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BoardComponent } from './board/board.component';
import { BoardService } from '../service/board.service';
import { Observable } from 'rxjs';
import { Board, Lane, getNewBoard, getNewLane } from '../types/task';
import { generateUUID, getStatusPath } from '../utils/utils';
import { ModalService } from '../service/modal.service';
import { StorageService } from '../service/storage.service';

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
  constructor(
    private boardService: BoardService,
    protected modalService: ModalService,
    private storageService: StorageService
  ) {
    if( getStatusPath() !== null ){
      this.storageService.initWithStoragePath(getStatusPath()!);
    }
  }

  ngAfterViewInit(): void {
    if(this.boardService.boards.length === 0) {
      this.addNewBoard()
    }
    this.boardService.selectFirstBoard();
    
    this.boardService.selectedBoard$.subscribe(board => {
      setTimeout(() => { this.board = board })
      //this.board = board
    })
  }

  getFirstLane(): Lane | undefined {
    return this.board?.children.find(child => child.tags.length === 0);
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

  hasStoragePathSet() {
    return getStatusPath() !== null;
  }

}
