import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BoardComponent } from './board/board.component';
import { BoardService } from '../service/board.service';
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
export class AppComponent implements OnInit {

  title = 'trep-tracker';

  constructor(private boardService: BoardService) {

  }
  ngOnInit(): void {
    //this.addBoard()
  }

  addBoard() {
    let laneId = generateUUID();
    this.boardService.addBoard({
      id: generateUUID(),
      _type: "board",
      textContent: "Board",
      tags:[],
      children: [{
        id: generateUUID(),
        tags:[],
        showChildren: true,
        textContent: "Lane " + laneId,
        children: [],
        _type: "lane",
      }]
    })
  }

  get boards$(): Observable<Board[]> {
    return this.boardService.boards$;
  }

}
