import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, forwardRef, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Board, Lane, Container, Task, Tag, Status, Priority, ISODateString } from '../../types/types';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
 
import { hashCode, isPlaceholder, setCaretPosition } from '../../utils/utils';
import { ContainerComponentRegistryService } from '../../service/registry.service';
import { ContainerComponent } from '../base/base.component';
import { ClickService } from '../../service/click.service';

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

  @Output() createNewTask: EventEmitter<void> = new EventEmitter();
  @Output() onToggleShowNotes: EventEmitter<boolean> = new EventEmitter();

  editorActive: boolean = false;
  selected: boolean = false;
  showNotes: boolean = false;
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

  toggleShowNotes() {
    this.showNotes = !this.showNotes;
    this.onToggleShowNotes.emit(this.showNotes);
  }
  toggleShowInGantt() {
    this.task.includeInGantt = !this.task.includeInGantt;
    this.boardService.publishBoardUpdate();
  }
}
