import { Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { Board, Lane, Task } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { plugins, schema } from '../../utils/prosemirror';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';

@Component({
  selector: 'task',
  //standalone: true,
  //imports: [NgxEditorModule,],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit, OnDestroy {

  @HostBinding('style.position') position = 'relative';
  @HostBinding('style.top') top: string | undefined;
  @HostBinding('style.left') left: string | undefined;

  @ViewChild('editorElement') editorElement: ElementRef | undefined; 
  @Input() task!: Task;
  @Input() lane!: Lane;
  @Input() board!: Board;

  @Output() createNewTask: EventEmitter<void> = new EventEmitter();
  
  editorActive: boolean = false;
  selected: boolean = false;

  editor: Editor | undefined;

  deltaX = 0;
  deltaY = 0;
  
  constructor(
    private boardService: BoardService, 
    private dragService: DragService,
    protected keyboardService: KeyboardService,
    private el: ElementRef) {

  }

  editorChange($event: string) {
    // console.log($event)
    if($event.endsWith('<p></p>')) {
      this.editor?.setContent($event.replace('<p></p>', ''));
      this.createNewTask.emit();
    }
  }

  ngOnInit(): void {
    this.boardService.editorActiveTask$.subscribe((task) => {
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
    this.boardService.selectedTasks$.subscribe((tasks) => {
      if( tasks && tasks.find(t => t.id === this.task.id)) {
        this.selected = true;
      }else{
        this.selected = false;
      }
    })
  }

  activateEditorOnTask() {
    this.boardService.activateEditorOnTask(this.lane,this.task);
    this.boardService.clearSelectedTasks();
    this.boardService.selectTask(this.lane, this.task);
  }

  selectTask() {
    this.boardService.selectTask(this.lane,this.task);
    this.boardService.activateEditorOnTask(this.lane,this.task);
  }

  toggleTaskStatus(){
    this.boardService.toggleTaskStatus(this.task);
  }

  /**
   * If the task was dropped over another, put the task in the same lane after/before that task.
   * Otherwise, create another floating lane
   * @param $event 
   */
  onDragEnd($event: DragEvent) {
    const style = getComputedStyle(document.querySelectorAll('body')[0])
    const paddingLeft = parseInt(style.paddingLeft);
    const paddingTop = parseInt(style.paddingTop);
    //
    this.dragService.publishDragEvent( this.task, {
      cursorX: $event.clientX, 
      cursorY:$event.clientY, 
      deltaX: this.deltaX + paddingLeft, 
      deltaY: this.deltaY + paddingTop 
    })
    this.boardService.clearSelectedTasks();
    this.boardService.selectTask(this.lane, this.task);
  }
  
  onDragStart($event: DragEvent) {
    if(!this.editorActive && !this.selected){
      this.boardService.clearSelectedTasks();
    }
    if(!this.selected){
      this.boardService.selectTask(this.lane,this.task);
    }

    const rect = this.el.nativeElement.getBoundingClientRect();

    this.deltaX = $event.clientX - rect.left //- paddingLeft;
    this.deltaY = $event.clientY - rect.top //- paddingTop;
    // console.debug(` click x ${$event.clientX}, click y ${$event.clientY}, rect x ${rect.left}, rect y ${rect.top}, computed x ${this.clickX}, computed y ${this.clickY}`)
  }

  destroyEditor(): void {
    this.editor?.destroy();
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }
}
