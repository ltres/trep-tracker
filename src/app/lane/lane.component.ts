import { Component, ElementRef, HostBinding, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Container, Lane, Task } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { generateUUID } from '../../utils/utils';
import { Observable } from 'rxjs';
import { TaskComponent } from '../task/task.component';
import { DraggableComponent } from '../draggable/draggable.component';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';

@Component({
  selector: 'lane[lane][board]',
  //standalone: true,
  // imports: [],
  templateUrl: './lane.component.html',
  styleUrl: './lane.component.scss'
})
export class LaneComponent extends DraggableComponent implements OnInit{

  @HostBinding('style.position') position = 'relative';
  @HostBinding('style.top') top: string | undefined;
  @HostBinding('style.left') left: string | undefined;

  @ViewChildren(TaskComponent, { read: ElementRef }) taskComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(TaskComponent) taskComponents: QueryList<TaskComponent> | undefined;

  @Input() lane!: Lane;
  @Input() board!: Board;

  constructor(
    protected override boardService: BoardService, 
    protected override dragService: DragService,
    protected override keyboardService: KeyboardService,
    public override el: ElementRef) {
    super(boardService, dragService, keyboardService, el);
  }

  override get object(): Container | undefined {
    return this.lane;
  }

  ngOnInit(): void {
    this.boardService.getLane$(this.lane).subscribe( l => {
      if(!l){
        return;
      }
      this.lane = l;
      this.top = l.coordinates?.y + 'px';
      this.left = l.coordinates?.x + 'px'
    })
  }

  get tasks$(): Observable<Task[] | undefined> {
    return this.boardService.getTasks$(this.lane);
  } 

  createNewTask() {
    let uuid = generateUUID();
    let task: Task = { 
      textContent: `Task ${this.boardService.getTasksCount() + 1} ${uuid}`, 
      id:uuid, 
      status: "todo", 
      _type: 'task',
      children: []
    };
    this.boardService.addAsChild(this.lane, [task]);
    this.boardService.clearSelectedTasks();
    this.boardService.selectTask(this.lane,task, 'mouse');
    this.boardService.activateEditorOnTask(this.lane,task);
  }


}
