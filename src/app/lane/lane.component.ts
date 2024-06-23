import { Component, ElementRef, HostBinding, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Container, Lane, Priority, Tag, Task, getNewTask } from '../../types/task';
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


  menuOpen = false

  constructor(
    protected override boardService: BoardService,
    protected override dragService: DragService,
    protected override keyboardService: KeyboardService,
    protected override registry: RegistryService,
    public override el: ElementRef) {
    super(boardService, dragService, keyboardService, registry, el );
  }

  @HostBinding('style.overflow-x')
  get overflowX(): string {
    return this.menuOpen ? 'visible' : 'auto';
  }

  override get object(): Container | undefined {
    return this.lane;
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  get tasks(): Observable<Task[] | undefined> {
    return this.boardService.getTasks$(this.lane, this.lane.priority);
  }

  get taggedTasks(): Observable<Task[] | undefined> {
    return this.boardService.getTaggedTasks$(this.lane.tags, this.lane.priority);
  }

  displayStaticStuff(): boolean{
    return this.isTagged() || ( this.lane.priority !== undefined && this.lane.children.length === 0 );
  }

  isTagged(): boolean {
    return this.lane.tags? this.lane.tags.length > 0 : false;
  }

  createNewTask() {
    let task: Task = getNewTask( `Task ${this.boardService.getTasksCount() + 1}` );
    this.boardService.addAsChild(this.lane, [task]);
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(task);
    this.boardService.activateEditorOnTask(this.lane, task, 0);
  }

  deleteLane() {
    this.boardService.deleteLane(this.lane);
  }

  toggleShowChildren() {
    this.lane.showChildren = !this.lane.showChildren;
    this.boardService.publishBoardUpdate();
  }
  nukeArchived() {
    this.boardService.nukeArchived(this.lane);
  }

}
