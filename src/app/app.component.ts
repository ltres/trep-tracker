import { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, ApplicationRef, Component, Inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BoardComponent } from './board/board.component';
import { BoardService } from '../service/board.service';
import { Observable } from 'rxjs';
import { Board, Lane, getNewBoard, getNewLane } from '../types/task';
import { generateUUID, getStatusPath } from '../utils/utils';
import { ModalService } from '../service/modal.service';
import { LocalFileStorageService } from '../service/local-file-storage.service';
import { StorageServiceAbstract } from '../types/storage';

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
  displayModal = false;
  constructor(
    private boardService: BoardService,
    protected modalService: ModalService,
    @Inject('StorageServiceAbstract') protected storageService: StorageServiceAbstract,
    private appRef: ApplicationRef
  ) { }

  ngAfterViewInit(): void {
    if(this.boardService.boards.length === 0) {
      this.addNewBoard()
    }
    this.boardService.selectFirstBoard();
    
    this.boardService.selectedBoard$.subscribe(board => {
      setTimeout(() => { this.board = board })
      //this.board = board
    })
    this.modalService.displayModal$.subscribe(display => {
      setTimeout(() => { this.displayModal = display; })    
    });
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
    return this.storageService.isStatusLocationConfigured();
  }

}
