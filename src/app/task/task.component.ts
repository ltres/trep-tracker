import { Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { Board, Lane, Container, Task } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { plugins, schema } from '../../utils/prosemirror';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { DraggableComponent } from '../draggable/draggable.component';

@Component({
  selector: 'task[task][lane][parent][board]',
  //standalone: true,
  //imports: [NgxEditorModule,],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent extends DraggableComponent implements OnInit, OnDestroy {
  @ViewChild('editorElement') editorElement: ElementRef | undefined; 
  @Input() task!: Task;
  @Input() lane!: Lane;
  @Input() parent!: Container;

  @Input() board!: Board;

  @Output() createNewTask: EventEmitter<void> = new EventEmitter();
  
  editorActive: boolean = false;
  selected: boolean = false;

  editor: Editor | undefined;

  constructor(
    protected override boardService: BoardService, 
    protected override dragService: DragService,
    protected override keyboardService: KeyboardService,
    public override el: ElementRef) {
    super(boardService, dragService, keyboardService, el);
  }

  override get object(): Container | undefined {
    return this.task;
  }

  editorChange($event: string) {
    // console.log($event)
    if($event.endsWith('<p></p>')) {
      this.editor?.setContent($event.replace('<p></p>', ''));
      this.createNewTask.emit();
    }
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.subscriptions = this.boardService.editorActiveTask$.subscribe((task) => {
      if( task && task.id === this.task.id) {
        this.editorActive = true;
        this.editor = new Editor({
          schema,
          plugins,
        });
        this.editor.commands.focus().exec();
      } else {
        this.editorActive = false;
        this.editor?.destroy();
      }
    });
    this.subscriptions = this.boardService.selectedTasks$.subscribe((tasks) => {
      if( tasks && tasks.find(t => t.id === this.task.id)) {
        this.selected = true;
      }else{
        this.selected = false;
      }
    })
  }
    /**
   * If the task was dropped over another, put the task in the same lane after/before that task.
   * Otherwise, create another floating lane
   * @param $event 
   */
    override onDragEnd($event: DragEvent) {
      super.onDragEnd($event, this.task);
      this.boardService.clearSelectedTasks();
      this.boardService.selectTask(this.lane, this.task, 'mouse');
    }
  
    override onDragStart($event: DragEvent) {
      if (!this.editorActive && !this.selected) {
        this.boardService.clearSelectedTasks();
      }
      if (!this.selected) {
        this.boardService.selectTask(this.lane, this.task, 'mouse');
      }
      super.onDragStart($event);
    }

  activateEditorOnTask() {
    this.boardService.activateEditorOnTask(this.lane,this.task);
    this.boardService.clearSelectedTasks();
    this.boardService.selectTask(this.lane, this.task, 'mouse');
  }

  selectTask() {
    this.boardService.selectTask(this.lane,this.task, 'mouse');
    this.boardService.activateEditorOnTask(this.lane,this.task);
  }

  toggleTaskStatus(){
    this.boardService.toggleTaskStatus(this.task);
  }

  hasNextSibling(): boolean {
    return this.parent.children.indexOf(this.task) < this.parent.children.length - 1;
  }

  destroyEditor(): void {
    this.editor?.destroy();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.destroyEditor();
  }
}
