import { AfterViewInit, ApplicationRef, Component, Inject } from '@angular/core';

import { BoardService } from '../service/board.service';
import { Observable } from 'rxjs';
import { Board, Lane } from '../types/types';
import { ModalService } from '../service/modal.service';
import { StorageServiceAbstract } from '../types/storage';

@Component({
  selector: 'app-root',
  //standalone: true,
  //imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit {
  title = 'trep-tracker';
  board: Board | undefined;
  displayModal = false;
  constructor(
    private boardService: BoardService,
    protected modalService: ModalService,
    @Inject('StorageServiceAbstract') protected storageService: StorageServiceAbstract,
    private appRef: ApplicationRef,
  ) { }

  ngAfterViewInit(): void {
    this.boardService.selectedBoard$.subscribe(board => {
      setTimeout(() => { this.board = board; });
      //this.board = board
    });
    this.modalService.displayModal$.subscribe(display => {
      setTimeout(() => { this.displayModal = display.show; });
    });
  }

  getFirstLane(): Lane | undefined {
    return this.board?.children.find(child => child.tags.length === 0);
  }

  get boards$(): Observable<Board[]> {
    return this.boardService.boards$;
  }

  isStatusPresent() {
    return this.storageService.isStatusPresent();
  }

}
