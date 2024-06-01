import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Task } from '../../types/task';
import { TaskComponent } from '../task/task.component';
import { TaskService } from '../../service/task.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'main-board',
  //standalone: true,
  //imports: [TaskComponent],
  templateUrl: './main-board.component.html',
  styleUrl: './main-board.component.scss',
})
export class MainBoardComponent implements OnInit{
  @ViewChildren(TaskComponent) taskComponents!: QueryList<TaskComponent>;

  constructor(private taskService: TaskService) {
    // this.taskService = taskService;
  }

  get tasks(): Observable<Task[]> {
    return this.taskService.tasks$;
  } 

  ngOnInit(){

  }

  createNewTask() {
    let task = {textContent: ''} as Task;
    this.taskService.addTask(task);
    this.taskService.activeTask = task;
  }

}
 