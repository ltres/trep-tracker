import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, forwardRef, HostBinding, Input, OnInit, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { Board, Container, Lane, PickerOutput, Priority, Status, Tag, Task, getNewTask } from '../../types/types';
import { BoardService } from '../../service/board.service';
import { hashCode, isArchive, isPlaceholder, isStatic } from '../../utils/utils';
import { map, Observable, of } from 'rxjs';
import { TaskComponent } from '../task/task.component';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { ContainerComponentRegistryService } from '../../service/registry.service';
import { ContainerComponent } from '../base/base.component';
import { ModalService } from '../../service/modal.service';
import { layoutValues, tagIdentifiers } from '../../types/constants';
import {  isPriorityArray,  isRecurringTask,  isStatusArray,  isTagArray, isTask } from '../../utils/guards';

@Component({
  selector: 'lane[lane][board]',
  //standalone: true,
  // imports: [],
  templateUrl: './lane.component.html',
  styleUrl: './lane.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ContainerComponent, useExisting: forwardRef(() => LaneComponent) },
  ],
})
export class LaneComponent extends ContainerComponent implements OnInit {

  @ViewChildren(TaskComponent, { read: ElementRef }) taskComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(TaskComponent) taskComponents: QueryList<TaskComponent> | undefined;
  @Input() lane!: Lane;
  @Input() board!: Board;
  @Input() displayedInFixedLayout: boolean = false;
  @ViewChild('gantt') ganttTemplate: TemplateRef<unknown> | null = null;

  menuOpen = false;
  hoveringTooltip = false;

  interactingWithChildTasks = false;
  showMoveToBoards = false;
  debounce: ReturnType<typeof setTimeout> | undefined;
  showDatePicker: boolean = false;

  constructor(
    protected boardService: BoardService,
    protected dragService: DragService,
    protected keyboardService: KeyboardService,
    protected override registry: ContainerComponentRegistryService,
    protected modalService: ModalService,
    public override el: ElementRef,
    private cdr: ChangeDetectorRef) {
    super(registry, el);

  }
  receiveDrop(container: Container){
    if( !isTask(container) ){
      throw new Error("Cannot drop something that is not a task on a lane")
    }
    this.boardService.addAsChild(this.lane, [container]);
  };

  receiveDropToDumb(precedingTask: Task | undefined, container: Container){
    if( !isTask(container) ){
      throw new Error("Cannot drop something that is not a task on a lane")
    }
    if(!precedingTask){
      this.boardService.addAsChild(this.lane, [container], true);
    }else{
      this.boardService.addAsSiblings(this.lane, precedingTask, [container], 'after');
    }
  };

  override ngOnInit(): void {
    super.ngOnInit();
    this.boardService.boards$.subscribe( () => {
      this.cdr.detectChanges();
    });
    this.boardService.lastSelectedTask$.subscribe(lastSelectedTask => {
      if(lastSelectedTask?.lane.id === this.lane.id){
        this.active = true;
      }else{
        this.active = false;
      }
    });
  }

  @HostBinding('style.overflow-x')
  get overflowX(): string {
    if( this.displayedInFixedLayout || this.menuOpen || this.hoveringTooltip || this.interactingWithChildTasks){
      return 'visible';
    }else{
      return 'auto';
    }
  }
  @HostBinding('class.active')
    active: boolean = false;

  @HostBinding('class.non-static')
  get static(): boolean{
    return !isStatic(this.lane) && !isArchive(this.lane)
  }

  override get container(): Container {
    return this.lane;
  }

  // Lane's self children, eventually filtered by priority, status.
  get tasks(): Observable<Task[] | undefined> {
    return this.boardService.getTasks$(this.lane, this.lane.priority, this.lane.status, this.isArchive(this.lane) ? false : true, this.isArchive(this.lane) ? 'archived' : undefined, 'desc');
  }

  get tasksCount(): Observable<number | undefined>{
    return this.tasks.pipe( map( arr => arr?.filter(t => !isPlaceholder(t)).length ) );
  }

  // Statically displayed tasks, eventually filtered by priority, status.
  get staticTasks(): Observable<Task[] | undefined> {
    return this.boardService.getStaticTasks$(this.board, this.lane.tags, this.lane.priority, this.lane.status, this.lane.startTimeframe, this.lane.endTimeframe, this.isArchive(this.lane) ? false : true, this.isArchive(this.lane) ? 'archived' : undefined, 'desc');
  }

  get staticTasksCount(): Observable<number | undefined>{
    return this.staticTasks.pipe( map( arr => arr?.filter(t => !isPlaceholder(t)).length ) );
  }

  isStatic(): boolean {
    return isStatic(this.lane);
  }

  isTagged(): boolean {
    return this.lane.tags ? this.lane.tags.length > 0 : false;
  }

  createNewTask() {
    const task: Task = getNewTask(this.lane, undefined, undefined);
    this.boardService.addAsChild(this.lane, [task]);
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(this.lane, task);
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
    const allOldPresent = this.lane.tags.filter(oldTag => $event.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === this.lane.tags.length;
    const allNewPresent = $event.filter(oldTag => this.lane.tags.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === $event.length;

    if (!allOldPresent || !allNewPresent) {
      this.lane.tags = $event;
      this.debounceBoardUpdate();
    }
  }
  debounceBoardUpdate() {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => {
      this.boardService.publishBoardUpdate();
    }, 500);
  }
  updateStatus($event: Status[] | Status | undefined) {
    this.lane.status = Array.isArray($event) ? $event : ($event ? [$event] : undefined);
    this.boardService.updateStatus(this.board, this.lane, $event);
  }

  trackBy(index: number, task: Task): number {
    return hashCode(index + task.id);
  }
  togglePriority(prio: Priority[] | Priority | undefined) {
    this.lane.priority = Array.isArray(prio) ? prio : (prio ? [prio] : undefined);
    this.boardService.publishBoardUpdate();
  }

  moveLane(direction: 'right' | 'left' | 'up' | 'down') {
    if(direction === 'up' || direction === 'down'){
      this.boardService.moveLaneInColumn(this.board, this.lane, direction);
    }else{
      this.lane.layouts[this.board.layout].column = this.lane.layouts[this.board.layout].column + (direction === 'right' ? 1 : -1);
      this.boardService.moveLaneInColumn(this.board, this.lane);
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
      return this.lane.layouts[this.board.layout].column < layoutValues[this.board.layout].columns - 1;
    }
    return false;
  }
  autoSort(){
    this.boardService.autoSort(this.lane);
  }

  openGantt() {
    this.modalService.setModalContent(this.ganttTemplate);
    this.modalService.setDisplayModal(true, 'full');
  }

  getGanttTasks$(): Observable<Task[] | undefined> {
    return isStatic(this.lane) ?
      this.staticTasks.pipe( map(tasks => tasks?.filter(t => t.includeInGantt) ?? [])) :
      of(this.lane.children.filter(t =>  t.includeInGantt ));
  }
  toggleCollapse() {
    this.lane.collapsed = !this.lane.collapsed
    this.boardService.publishBoardUpdate();
  }

  openDatePicker() {
    this.showDatePicker = true;
  }

  setTimeframe(event: PickerOutput | undefined) {
    if(! event || !('timeframe' in event)){
      throw new Error("No timeframe for lane");
    }
    this.lane.startTimeframe = event.timeframe[0] !== 'no' ? event.timeframe[0] : undefined;
    this.lane.endTimeframe = event.timeframe[1] !== 'no' ? event.timeframe[1] : undefined;
    this.boardService.publishBoardUpdate();
    this.showDatePicker = false;
  }

  beautifyOrList(arg0: (Status | Priority | Tag)[]) {
    if(isStatusArray(arg0)){
      return arg0.map( s => `<span class="${s}">${s}</span>`).join(" or ")
    }else if(isPriorityArray(arg0)){
      return arg0.map( s => `<span class="priority-${s}">${s}</span>`).join(" or ")
    }else if( isTagArray(arg0) ){
      return arg0.map( t => `<span tag="true" class="${t.type}">${tagIdentifiers.find( ta => ta.type == t.type)?.symbol}${t.tag}</span>`).join(" or ")
    }
    return "";
  }
  isPlaceholder(t: Task) {
    return isPlaceholder(t)
  }
  toggleLaneMenu() {
    this.menuOpen = !this.menuOpen
  }
  isRecurringTask(t: Task):boolean {
    return isRecurringTask(t)
  }

}
