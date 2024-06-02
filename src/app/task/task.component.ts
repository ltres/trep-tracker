import { Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { Board, Task } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { plugins, schema } from '../../utils/prosemirror';

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
  @Input() board!: Board;

  @Output() createNewTask: EventEmitter<void> = new EventEmitter();
  @Output() askFocus: EventEmitter<Task> = new EventEmitter();

  editor: Editor | undefined;

  deltaX = 0;
  deltaY = 0;
  constructor(private boardService: BoardService, private renderer: Renderer2, private el: ElementRef) {

  }

  editorChange($event: string) {
    // console.log($event)
    if($event.endsWith('<p></p>')) {
      this.editor?.setContent($event.replace('<p></p>', ''));
      this.createNewTask.emit();
    }
  }

  ngOnInit(): void {
    this.boardService.activeTask$.subscribe((task) => {
      if( task && task.id === this.task.id) {
        this.task = task;
        this.editor = new Editor({
          schema,
          plugins,
        });
        this.editor.commands.focus().exec();
        setTimeout(() => {
          // @ts-ignore
          // this.editorElement?.elementRef.nativeElement.querySelectorAll('[contenteditable]')[0].click();
        },0);
        //const endPos = this.editor.view.state.doc.content.size;
        //const transaction = this.editor.view.state.tr.setSelection(Selection.atEnd(view.docView.node));

      } else {
        this.task.active = false;
        this.editor?.destroy();
      }
    });
  }

  activateTask() {
    this.boardService.setActiveTask(this.task);
  }

  toggleTaskStatus(){
    this.boardService.toggleTaskStatus(this.task);
  }

  /**
   * If the task was dropped over another, put the task in the same lane after/before that task.
   * Otherwise, create another floating lane
   * @param $event 
   */
  dragEnd($event: DragEvent) {
    const style = getComputedStyle(document.querySelectorAll('body')[0])
    const paddingLeft = parseInt(style.paddingLeft);
    const paddingTop = parseInt(style.paddingTop);
    //
    this.boardService.publishDragEvent( this.task, {
      cursorX: $event.clientX, 
      cursorY:$event.clientY, 
      deltaX: this.deltaX + paddingLeft, 
      deltaY: this.deltaY + paddingTop 
    })
  }
  
  dragStart($event: DragEvent) {
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
