import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostBinding, HostListener, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Container, Lane, Priority, Status, Tag, Task, archivedLaneId, getNewTask } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { generateUUID, hashCode, isArchive, isStatic } from '../../utils/utils';
import { Observable } from 'rxjs';
import { TaskComponent } from '../task/task.component';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { RegistryService } from '../../service/registry.service';
import { BaseComponent } from '../base/base.component';

@Component({
  selector: 'lane[lane][board]',
  //standalone: true,
  // imports: [],
  templateUrl: './lane.component.html',
  styleUrl: './lane.component.scss'

})
export class LaneComponent extends BaseComponent implements OnInit {
  @ViewChildren(TaskComponent, { read: ElementRef }) taskComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(TaskComponent) taskComponents: QueryList<TaskComponent> | undefined;

  @Input() lane!: Lane;
  @Input() board!: Board;

  menuOpen = false
  debounce: any;

  constructor(
    protected boardService: BoardService,
    protected dragService: DragService,
    protected keyboardService: KeyboardService,
    protected override registry: RegistryService,
    public override el: ElementRef,
    public cdr: ChangeDetectorRef) {
    super(registry, el);
  }

  @HostListener('document:click', ['$event'])
  setZIndex($event: any) {
    let el = this.el.nativeElement as HTMLElement;
    if (el.contains($event.target)) {
      el.style.zIndex = "100";
    } else {
      el.style.zIndex = "";
    }
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
    this.cdr.detectChanges = (...args) => {
      console.log('Change detection triggered', new Error().stack);
      return Object.getPrototypeOf(this.cdr).detectChanges.apply(this.cdr, args);
    };
  }

  get tasks(): Observable<Task[] | undefined> {
    return this.boardService.getTasks$(this.lane, this.lane.priority, this.lane.status, this.isArchive(this.lane) ? false: true, this.isArchive(this.lane) ? "archived" : undefined, 'desc');
  }

  get taggedTasks(): Observable<Task[] | undefined> {
    return this.boardService.getTaggedTasks$(this.lane.tags, this.lane.priority, this.lane.status, this.isArchive(this.lane) ? false: true, this.isArchive(this.lane) ? "archived" : undefined, 'desc');
  }

  isStatic(): boolean {
    return isStatic(this.lane)
  }

  isTagged(): boolean {
    return this.lane.tags ? this.lane.tags.length > 0 : false;
  }

  createNewTask() {
    let task: Task = getNewTask(this.lane,`Task ${this.boardService.getTasksCount(this.board) + 1}`);
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
  updateStatus($event: Status) {
    this.boardService.updateStatus(this.board, this.lane, $event);
  }
  updatePriority($event: Priority | undefined) {
    this.lane.priority = $event;
    this.boardService.publishBoardUpdate()
  }
  trackBy(index: number, task: Task): number {
    return hashCode(task.id);
  }

}
