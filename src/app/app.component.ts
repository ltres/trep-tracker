import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BoardComponent } from './board/board.component';
import { BoardService } from '../service/task.service';
import { Observable } from 'rxjs';
import { Board } from '../types/task';
import { generateUUID } from '../utils/utils';

@Component({
  selector: 'app-root',
  //standalone: true,
  //imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  title = 'trep-tracker';

  constructor(private boardService: BoardService) {

  }
  addBoard() {
    this.boardService.addBoard({
      id: generateUUID(),
      lanes: [{
        id: generateUUID(),
        tasks: []
      }]
    })
  }

  get boards$(): Observable<Board[]> {
    return this.boardService.boards$;
  }

}
