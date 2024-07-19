import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, forwardRef, HostBinding, HostListener, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Container, Lane, Layouts, Priority, Status, Tag, Task, archivedLaneId, getNewTask } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { generateUUID, hashCode, isArchive, isStatic } from '../../utils/utils';
import { Observable } from 'rxjs';
import { TaskComponent } from '../task/task.component';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { ContainerComponentRegistryService } from '../../service/registry.service';
import { ContainerComponent } from '../base/base.component';

@Component({
  selector: 'lane[lane][board]',
  //standalone: true,
  // imports: [],
  templateUrl: './lane.component.html',
  styleUrl: './lane.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: ContainerComponent, useExisting: forwardRef(() => LaneComponent)}
  ]
})
export class LaneComponent extends ContainerComponent implements OnInit {


  @ViewChildren(TaskComponent, { read: ElementRef }) taskComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(TaskComponent) taskComponents: QueryList<TaskComponent> | undefined;
  @Input() lane!: Lane;
  @Input() board!: Board;
  @Input() displayedInFixedLayout: boolean = false;
  
  menuOpen = false
  hoveringTooltip = false

  draggingInside = false
  showMoveToBoards = false;
  debounce: any;

  constructor(
    protected boardService: BoardService,
    protected dragService: DragService,
    protected keyboardService: KeyboardService,
    protected override registry: ContainerComponentRegistryService,
    public override el: ElementRef,
    private cdr: ChangeDetectorRef) {
    super(registry, el);

  }
  override ngOnInit(): void {
    super.ngOnInit();
    this.boardService.boards$.subscribe(boards => {
      this.cdr.detectChanges();
    });
  }

  @HostBinding('style.overflow-x')
  get overflowX(): string {
    return this.displayedInFixedLayout? 'visible' : (this.menuOpen || this.hoveringTooltip ? 'visible' : 'auto');
  }

  override get container(): Container {
    return this.lane;
  }

  // Lane's self children, eventually filtered by priority, status.
  get tasks(): Observable<Task[] | undefined> {
    return this.boardService.getTasks$(this.lane, this.lane.priority, this.lane.status, this.isArchive(this.lane) ? false : true, this.isArchive(this.lane) ? "archived" : undefined, 'desc');
  }

  // Statically displayed tasks, eventually filtered by priority, status.
  get staticTasks(): Observable<Task[] | undefined> {
    return this.boardService.getStaticTasks$(this.board, this.lane.tags, this.lane.priority, this.lane.status, this.isArchive(this.lane) ? false : true, this.isArchive(this.lane) ? "archived" : undefined, 'desc');
  }

  isStatic(): boolean {
    return isStatic(this.lane)
  }

  isTagged(): boolean {
    return this.lane.tags ? this.lane.tags.length > 0 : false;
  }

  createNewTask() {
    let task: Task = getNewTask(this.lane, undefined);
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
  archiveDones() {
    this.boardService.archiveDones(this.board, this.lane);
  }
  isArchive(arg0: Lane): boolean {
    return isArchive(arg0);
  }
  updateLaneTags($event: Tag[]) {
    let allOldPresent = this.lane.tags.filter(oldTag => $event.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === this.lane.tags.length
    let allNewPresent = $event.filter(oldTag => this.lane.tags.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === $event.length

    if (!allOldPresent || !allNewPresent) {
      this.lane.tags = $event;
      this.debounceBoardUpdate()
    }
  }
  debounceBoardUpdate() {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => {
      this.boardService.publishBoardUpdate()
    }, 500)
  }
  updateStatus($event: Status[] | Status | undefined) {
    this.lane.status = Array.isArray($event) ? $event : ($event ? [$event] : undefined);
    this.boardService.updateStatus(this.board, this.lane, $event);
  }

  trackBy(index: number, task: Task): number {
    return hashCode(task.id);
  }
  togglePriority(prio: Priority[] | Priority | undefined) {
    this.lane.priority = Array.isArray(prio) ? prio : (prio ? [prio] : undefined);
    this.boardService.publishBoardUpdate()
  }

  moveLane(direction: 'right' | 'left' | 'up' | 'down') {
    if(direction === 'up' || direction === 'down'){
      this.boardService.reorderLayoutColumn(this.board, this.lane, direction);
    }else{
      this.lane.layouts[this.board.layout].column = this.lane.layouts[this.board.layout].column + (direction === 'right' ? 1 : -1);
      this.boardService.reorderLayoutColumn(this.board, this.lane);
    }

    this.boardService.publishBoardUpdate();
  }
  canMove(direction: 'right' | 'left' | 'up' | 'down'): boolean {
    if(direction === 'up'){
      return this.lane.layouts[this.board.layout].order > 0;
    }else if(direction === 'down'){
      return this.board.children.filter(c => c.layouts[this.board.layout].column === this.lane.layouts[this.board.layout].column).length > this.lane.layouts[this.board.layout].order + 1;
    }else if(direction === 'left'){
      return this.lane.layouts[this.board.layout].column > 0;
    }else if(direction === 'right'){
      return this.lane.layouts[this.board.layout].column < Layouts[this.board.layout].columns - 1;
    }
    return false;
  }
  autoSort(){
    this.boardService.autoSort(this.lane);
  }

}
