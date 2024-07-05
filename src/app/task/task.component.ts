import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnDestroy, OnInit, Output, Renderer2, ViewChild, viewChild } from '@angular/core';
import { Board, Lane, Container, Task, Tag, Status, Priority } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { DraggableComponent } from '../draggable/draggable.component';
import { isPlaceholder, setCaretPosition } from '../../utils/utils';
import { RegistryService } from '../../service/registry.service';

@Component({
  selector: 'task[task][lane][parent][board]',
  //standalone: true,
  //imports: [NgxEditorModule,],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent extends DraggableComponent implements OnInit, OnDestroy {

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
    protected override boardService: BoardService,
    protected override dragService: DragService,
    protected override keyboardService: KeyboardService,
    protected override registry: RegistryService,
    public override el: ElementRef) {
    super(boardService, dragService, keyboardService, registry, el);
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
  override onDragEnd($event: DragEvent) {
    super.onDragEnd($event, this.task);
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(this.task);
  }

  override onDragStart($event: DragEvent) {
    if (!this.editorActive && !this.selected) {
      this.boardService.clearSelectedTasks();
    }
    if (!this.selected) {
      this.boardService.toggleTaskSelection(this.task);
    }
    super.onDragStart($event);
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



  toggleArchive() {
    this.boardService.toggleArchive(this.board, this.task);
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
      },500)
  }
  updateStatus($event: Status) {
    this.boardService.updateStatus(this.task, $event);
  }
  updatePriority($event: Priority | undefined) {
    this.task.priority = $event; 
    this.boardService.publishBoardUpdate()
  }
  

}
