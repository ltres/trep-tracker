import { Component, ElementRef, HostBinding, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Lane, Task } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { generateUUID } from '../../utils/utils';
import { Observable } from 'rxjs';
import { TaskComponent } from '../task/task.component';

@Component({
  selector: 'lane',
  //standalone: true,
  // imports: [],
  templateUrl: './lane.component.html',
  styleUrl: './lane.component.scss'
})
export class LaneComponent implements OnInit{
  @HostBinding('style.position') position = 'relative';
  @HostBinding('style.top') top: string | undefined;
  @HostBinding('style.left') left: string | undefined;

  @ViewChildren(TaskComponent, { read: ElementRef }) taskComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(TaskComponent) taskComponents: QueryList<TaskComponent> | undefined;

  @Input() lane!: Lane;
  @Input() board!: Board;

  constructor(private boardService: BoardService) {
    // this.taskService = taskService;
  }

  ngOnInit(): void {
    this.boardService.getLane$(this.lane).subscribe( l => {
      if(!l){
        return;
      }
      this.lane = l;
      this.position = l.position;
      this.top = l.coordinates?.y + 'px';
      this.left = l.coordinates?.x + 'px'
    })
  }

  get tasks$(): Observable<Task[] | undefined> {
    return this.boardService.getTasks$(this.lane);
  } 

  createNewTask() {
    let uuid = generateUUID();
    let task: Task = { textContent: `Task ${uuid}`, id:uuid, active: false, status: "todo" };
    this.boardService.addTask(this.lane, task);
    this.boardService.setActiveTask(task);
  }


}
