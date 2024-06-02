import { Component, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Lane, Task } from '../../types/task';
import { TaskComponent } from '../task/task.component';
import { BoardService } from '../../service/task.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'board',
  //standalone: true,
  //imports: [TaskComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit{
  @Input() board!: Board;
  @ViewChildren(TaskComponent) taskComponents!: QueryList<TaskComponent>;

  constructor(private boardService: BoardService) {
    // this.taskService = taskService;
  }


  get lanes$(): Observable<Lane[]> {
    return this.boardService.getLanes$(this.board);
  } 

  ngOnInit(){

  }

  focusTask($event: Task) {
    this.boardService.activeTask = $event;
  }
  

}
 