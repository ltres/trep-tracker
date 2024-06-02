import { Component, Input } from '@angular/core';
import { Lane, Task } from '../../types/task';
import { BoardService } from '../../service/task.service';
import { generateUUID } from '../../utils/utils';
import { Observable } from 'rxjs';

@Component({
  selector: 'lane',
  //standalone: true,
  // imports: [],
  templateUrl: './lane.component.html',
  styleUrl: './lane.component.scss'
})
export class LaneComponent {
  @Input() lane!: Lane;

  constructor(private boardService: BoardService) {
    // this.taskService = taskService;
  }

  get tasks$(): Observable<Task[]> {
    return this.boardService.getTasks$(this.lane);
  } 

  createNewTask() {
    let task = { textContent: 'Task', id: generateUUID() };
    this.boardService.addTask(this.lane, task);
    this.boardService.activeTask = task;
  }


}
