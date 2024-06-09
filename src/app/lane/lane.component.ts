import { Component, ElementRef, HostBinding, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Container, Lane, Task } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { generateUUID } from '../../utils/utils';
import { Observable } from 'rxjs';
import { TaskComponent } from '../task/task.component';
import { DraggableComponent } from '../draggable/draggable.component';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { RegistryService } from '../../service/registry.service';

@Component({
  selector: 'lane[lane][board]',
  //standalone: true,
  // imports: [],
  templateUrl: './lane.component.html',
  styleUrl: './lane.component.scss'
})
export class LaneComponent extends DraggableComponent implements OnInit {

  @ViewChildren(TaskComponent, { read: ElementRef }) taskComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(TaskComponent) taskComponents: QueryList<TaskComponent> | undefined;

  @Input() lane!: Lane;
  @Input() board!: Board;

  constructor(
    protected override boardService: BoardService,
    protected override dragService: DragService,
    protected override keyboardService: KeyboardService,
    protected override registry: RegistryService,
    public override el: ElementRef) {
    super(boardService, dragService, keyboardService, registry, el );
  }

  override get object(): Container | undefined {
    return this.lane;
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.subscriptions = this.boardService.getLane$(this.lane).subscribe(l => {
      if (!l) {
        return;
      }
      this.lane = l;
    })
  }

  get tasks$(): Observable<Task[] | undefined> {
    return this.boardService.getTasks$(this.lane);
  }

  createNewTask() {
    let uuid = generateUUID();
    let task: Task = {
      textContent: `Task ${this.boardService.getTasksCount() + 1} ${uuid}`,
      id: uuid,
      status: "todo",
      _type: 'task',
      children: []
    };
    this.boardService.addAsChild(this.lane, [task]);
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(task);
    this.boardService.activateEditorOnTask(task, 0);
  }

  deleteLane() {
    this.boardService.deleteLane(this.lane);
  }


}
