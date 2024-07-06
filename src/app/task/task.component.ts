import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, ViewChild, viewChild } from '@angular/core';
import { Board, Lane, Container, Task, Tag, Status, Priority, ISODateString, StateChangeDate } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { hashCode, isPlaceholder, isStatic, setCaretPosition } from '../../utils/utils';
import { RegistryService } from '../../service/registry.service';
import { BaseComponent } from '../base/base.component';

@Component({
  selector: 'task[task][lane][parent][board]',
  //standalone: true,
  //imports: [NgxEditorModule,],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent extends BaseComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('editor') editor: ElementRef | undefined;
  @Input() task!: Task;

  @Input() lane!: Lane;
  @Input() parent!: Container;
  @Input() board!: Board;

  @Input() showChildren: boolean = true;
  
  @Output() createNewTask: EventEmitter<void> = new EventEmitter();

  editorActive: boolean = false;
  selected: boolean = false;
  debounce: any;


  constructor(
    protected boardService: BoardService,
    protected dragService: DragService,
    protected keyboardService: KeyboardService,
    protected override registry: RegistryService,
    public override el: ElementRef) {
    super(registry, el);
  }
  override ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    console.log('changes', changes) ;
  }

  override get object(): Container | undefined {
    return this.task;
  }

  /*
  @HostListener('document:keydown', ['$event'])
  @HostListener('document:keyup', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if(event.key === 'Enter' && this.editorActive) {
      event.preventDefault()
    }
  }*/

  updateValue( $event: Event) {
    this.task.textContent = ($event.target as HTMLElement).innerHTML ?? '';
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.subscriptions = this.boardService.editorActiveTask$.subscribe((data: { lane: Lane, task: Task, startingCaretPosition: number | undefined } | undefined) => {
      if (!data) return;
      let { lane, task, startingCaretPosition } = data;
      if (task && task.id === this.task.id && lane && this.lane.id === lane.id) {
        this.editorActive = true;

        setTimeout(() => {
          this.editor?.nativeElement.focus();
          if (startingCaretPosition) {
            setCaretPosition(this.editor?.nativeElement, Math.min(startingCaretPosition,this.task.textContent.length));
          }
          //const editorInstance = this.editorComponent?.instance;
          //editorInstance.focus();
        }, 10)
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
    })
  }

  clickTask($event: MouseEvent) {
    this.activateEditorOnTask()
  }

  /**
 * If the task was dropped over another, put the task in the same lane after/before that task.
 * Otherwise, create another floating lane
 * @param $event 
 */
  dragEnd($event: DragEvent) {
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(this.task);
  }

  onDragStart($event: DragEvent) {
    if (!this.editorActive && !this.selected) {
      this.boardService.clearSelectedTasks();
    }
    if (!this.selected) {
      this.boardService.toggleTaskSelection(this.task);
    }
  }

  activateEditorOnTask() {
    this.boardService.activateEditorOnTask(this.lane, this.task, undefined);
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(this.task);
  }

  selectTask() {
    this.boardService.toggleTaskSelection(this.task);
    this.boardService.activateEditorOnTask(this.lane, this.task, undefined);
  }

  hasNextSibling(): boolean {
    return this.parent.children.indexOf(this.task) < this.parent.children.length - 1;
  }

  isPlaceholder(): boolean {
    return isPlaceholder(this.task);
  }

  updateTaskTags($event: Tag[]) {
    let allOldPresent = this.task.tags.filter( oldTag => $event.map( t => t.tag.toLowerCase() ).find( r => r === oldTag.tag.toLowerCase() ) ).length === this.task.tags.length
    let allNewPresent = $event.filter( oldTag => this.task.tags.map( t => t.tag.toLowerCase() ).find( r => r === oldTag.tag .toLowerCase()) ).length === $event.length

    if(!allOldPresent || !allNewPresent){
      this.task.tags = $event;
      this.debounceBoardUpdate()
    }
  }

  debounceBoardUpdate( ){
      if( this.debounce ){
          clearTimeout(this.debounce);
      }
      this.debounce = setTimeout( () => {
        this.boardService.publishBoardUpdate()
      },10)
  }
  updateStatus($event: Status) {
    this.boardService.updateStatus(this.board, this.task, $event);
  }
  updatePriority($event: Priority | undefined) {
    this.task.priority = $event; 
    this.boardService.publishBoardUpdate()
  }
  getToday(): ISODateString {
    return new Date().toISOString() as ISODateString;
  }

  parseDate(arg0: ISODateString | undefined): Date | undefined {
    if(!arg0) return undefined;
    return new Date(arg0);
  }
  
  isStaticLane(): boolean {
    return isStatic(this.lane)
  }
  trackBy(index: number, task: Task): number {
    return hashCode(task.id);
  }

}
