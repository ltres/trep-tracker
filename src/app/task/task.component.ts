/* eslint-disable no-fallthrough */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, forwardRef, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Board, Lane, Container, Task, Tag, Status, Priority, ISODateString, PickerOutput, DateFormat } from '../../types/types';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';

import { ContainerComponentRegistryService } from '../../service/registry.service';
import { ContainerComponent } from '../base/base.component';
import { ClickService } from '../../service/click.service';
import {  fromIsoString, formatDate, getDiffInDays } from '../../utils/date-utils';
import { setCaretPosition, isPlaceholder, hashCode } from '../../utils/utils';
import {  millisForMagnitudeStep } from '../../types/constants';
import { isRecurringTask, isRecurringTaskChild, isTask } from '../../utils/guards';

@Component({
  selector: 'task[task][lane][parent][board]',
  //standalone: true,
  //imports: [NgxEditorModule,],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ContainerComponent, useExisting: forwardRef(() => TaskComponent) },
  ],
})
export class TaskComponent extends ContainerComponent implements OnInit, OnDestroy {
  @ViewChild('editor') editor: ElementRef | undefined;
  @Input() task!: Task;
  @Input() lane!: Lane;
  @Input() parent!: Container;
  @Input() board!: Board;
  @Input() staticView: boolean = false;
  @Input() showChildren: boolean = true;

  @Input() enableGanttView: boolean = false;

  @Output() createNewTask: EventEmitter<void> = new EventEmitter();
  @Output() onToggleShowNotes: EventEmitter<boolean> = new EventEmitter();

  editorActive: boolean = false;
  selected: boolean = false;
  showNotes: boolean = false;
  showDatePicker: boolean = false;
  debounce: ReturnType<typeof setTimeout> | undefined;

  constructor(
    protected boardService: BoardService,
    protected dragService: DragService,
    protected keyboardService: KeyboardService,
    protected override registry: ContainerComponentRegistryService,
    private clickService: ClickService,
    public override el: ElementRef,
    protected cdr: ChangeDetectorRef,
  ) {
    super(registry, el);
  }
  
  receiveDrop(container: Container){
    if( !isTask(container) ){
      throw new Error("Cannot drop something that is not a task on a task")
    }
    if( isPlaceholder(this.task) ){
      this.boardService.addAsSiblings(this.lane, this.task, [container], 'after', true);
    }else{
      this.boardService.addAsChild(this.task, [container]);
    }
  };
  
  override get container(): Container {
    return this.task;
  }

  updateValue( $event: Event) {
    this.task.textContent = ($event.target as HTMLElement).innerHTML ?? '';
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.boardService.boards$.subscribe( () => {
      this.cdr.detectChanges(); // core for the change detection
    });
    this.subscriptions = this.boardService.editorActiveTask$.subscribe((data: { lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined) => {
      if (!data) return;
      const { lane, task, startingCaretPosition } = data;
      if (task && task.id === this.task.id && lane && this.lane.id === lane.id) {
        this.editorActive = true;

        setTimeout(() => {
          this.editor?.nativeElement.focus();
          if (startingCaretPosition) {
            setCaretPosition(this.editor?.nativeElement, Math.min(startingCaretPosition,this.task.textContent.length));
          }
          //const editorInstance = this.editorComponent?.instance;
          //editorInstance.focus();
        }, 10);
      } else {
        this.editorActive = false;
      }
    });
    this.subscriptions = this.boardService.selectedTasks$.subscribe((tasks) => {
      if (tasks && tasks.find(t => t.id === this.task.id)) {
        this.selected = true;
      } else {
        this.selected = false;
      }
      this.cdr.detectChanges();
    });
    this.subscriptions = this.clickService.click$.subscribe((target) => {
      if(!this.el.nativeElement.contains(target)) {
        setTimeout(() => {
          this.showNotes = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  clickTask() {
    this.activateEditorOnTask();
  }

  /**
 * If the task was dropped over another, put the task in the same lane after/before that task.
 * Otherwise, create another floating lane
 * @param $event
 */
  dragEnd() {
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(this.lane, this.task);
  }

  onDragStart() {
    if (!this.editorActive && !this.selected) {
      this.boardService.clearSelectedTasks();
    }
    if (!this.selected) {
      this.boardService.toggleTaskSelection(this.lane, this.task);
    }
  }

  activateEditorOnTask() {
    this.boardService.activateEditorOnTask(this.lane, this.task, undefined);
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(this.lane,this.task);
  }

  selectTask() {
    this.boardService.toggleTaskSelection(this.lane, this.task);
    this.boardService.activateEditorOnTask(this.lane, this.task, undefined);
  }

  hasNextSibling(): boolean {
    return this.parent.children.indexOf(this.task) < this.parent.children.length - 1;
  }

  isPlaceholder(): boolean {
    return isPlaceholder(this.task);
  }

  updateTaskTags($event: Tag[]) {
    const allOldPresent = this.task.tags.filter( oldTag => $event.map( t => t.tag.toLowerCase() ).find( r => r === oldTag.tag.toLowerCase() ) ).length === this.task.tags.length;
    const allNewPresent = $event.filter( oldTag => this.task.tags.map( t => t.tag.toLowerCase() ).find( r => r === oldTag.tag .toLowerCase()) ).length === $event.length;

    if(!allOldPresent || !allNewPresent){
      this.task.tags = $event;
      this.debounceBoardUpdate();
    }
  }

  debounceBoardUpdate( ){
    if( this.debounce ){
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout( () => {
      this.boardService.publishBoardUpdate();
    },10);
  }
  updateStatus($event: Status[] | Status | undefined) {
    if(Array.isArray($event) || $event === undefined){
      throw new Error('Only one status can be set at a time');
    }
    this.boardService.updateStatus(this.board, this.task, $event);
  }
  updatePriority($event: Priority[] | Priority | undefined) {
    if(Array.isArray($event) || $event === undefined){
      throw new Error('Only one priority can be set at a time');
    }
    this.task.priority = $event;
    this.boardService.publishBoardUpdate();
  }
  getToday(): ISODateString {
    return new Date().toISOString() as ISODateString;
  }

  parseDate(arg0: ISODateString | undefined): Date | undefined {
    if(!arg0) return undefined;
    return new Date(arg0);
  }

  isStaticView(): boolean {
    return this.staticView;
  }
  trackBy(index: number, task: Task): number {
    return hashCode(task.id);
  }

  storeNotes(ev: string) {
    this.task.notes = ev;
    this.boardService.publishBoardUpdate();
  }

  setDates( pickerOutput: PickerOutput | undefined ){
    if( !pickerOutput ){
      if( this.task.gantt ){
        this.task.gantt.showData = false;
      }
    }else{
      if( 'dates' in pickerOutput ){
        this.boardService.setTaskDates( this.task, pickerOutput.dates[0], pickerOutput.dates[1], pickerOutput.recurrence );
      }else if( 'timeframe' in pickerOutput ){
        throw new Error( 'Trying to set a timeframe on a task' );
      }
    }

    this.boardService.publishBoardUpdate();

    this.showDatePicker = false;
  }

  toggleShowNotes() {
    this.showNotes = !this.showNotes;
    this.onToggleShowNotes.emit(this.showNotes);
  }
  toggleShowInGantt() {
    this.task.includeInGantt = !this.task.includeInGantt;
    this.boardService.publishBoardUpdate();
  }

  isRecurringGanttTask(task: Task){
    return isRecurringTask(task);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  formatDate(date: ISODateString, format?: DateFormat){
    return formatDate(date, this.board.datesConfig );
  }

  getDiffInDays(date1: ISODateString, date2: ISODateString){
    return getDiffInDays(date1,date2)
  }

  // Returns a number representing how much the dateToCheck is after or before the referenceDate in millisForMagnitudeStep
  getProximityMagnitude(referenceDate: ISODateString, dateToCheck: ISODateString): number{
    const toCheck = new Date(dateToCheck);
    const diff = toCheck.getTime() - new Date(referenceDate).getTime();
    return Math.floor(diff / millisForMagnitudeStep)
  }

  getProximityIcons( dateToCheck: ISODateString, caseToCheck: "start" | "end" ): string{
    const prox = this.getProximityMagnitude(new Date().toISOString() as ISODateString, dateToCheck);
    switch(prox){
      case 2:
        return this.task.status === 'completed' || this.task.status === 'discarded' || this.task.status === 'archived' ? "" : "<span class='small translucent'>⏰</span>"
      case 1:
        return this.task.status === 'completed' || this.task.status === 'discarded' || this.task.status === 'archived' ? "" : "<span class='half-translucent'>⏰</span>"
      case 0:
        return this.task.status === 'completed' || this.task.status === 'discarded' || this.task.status === 'archived' ? "" : "<span>⏰</span>"
      case -1:
        switch(caseToCheck){
          case "start":
            return this.task.status === 'todo' || this.task.status === 'to-be-delegated' ? "<span class='small translucent'>😱</span>" : "";
          case "end":
            return this.task.status === 'completed' || this.task.status === 'discarded' || this.task.status === 'archived' ? "" : "<span class='small translucent'>😱</span>";
        }
      case -2:
        switch(caseToCheck){
          case "start":
            return this.task.status === 'todo' || this.task.status === 'to-be-delegated' ? "<span class='small half-translucent'>😱</span>" : "";
          case "end":
            return this.task.status === 'completed' || this.task.status === 'discarded' || this.task.status === 'archived' ? "" : "<span class='small half-translucent'>😱</span>";
        }
      case -3:
        switch(caseToCheck){
          case "start":
            return this.task.status === 'todo' || this.task.status === 'to-be-delegated' ? "<span>😱</span>" : "";
          case "end":
            return this.task.status === 'completed' || this.task.status === 'discarded' || this.task.status === 'archived' ? "" : "<span>😱</span>";
        }
      default: 
        return "";
    }
  }

  openDatePicker() {
    this.showDatePicker = true;
  }

  fromIsoString(d: ISODateString|undefined) {
    if(!d){
      return
    }
    return fromIsoString(d)
  }

  isRecurringTaskChild( r: Task ): boolean{
    return isRecurringTaskChild( r );
  }
    
}
