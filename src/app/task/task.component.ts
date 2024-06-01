import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { Task } from '../../types/task';
import { TaskService } from '../../service/task.service';

@Component({
  selector: 'task',
  //standalone: true,
  //imports: [NgxEditorModule,],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit, OnDestroy {

  @ViewChild('editorElement') editorElement: ElementRef | undefined; 
  @Input() task!: Task;
  @Output() createNewTask: EventEmitter<void> = new EventEmitter();
  @Output() askFocus: EventEmitter<Task> = new EventEmitter();

  isActive = false;
  editor!: Editor;

  clickX = 0;
  clickY = 0;
  constructor(private taskService: TaskService, private renderer: Renderer2, private el: ElementRef) {

  }

  editorChange($event: string) {
    // console.log($event)
    if($event.endsWith('<p></p>')) {
      this.editor.setContent($event.replace('<p></p>', ''));
      this.createNewTask.emit();
    }
  }

  ngOnInit(): void {
    this.taskService.tasks$.subscribe((tasks) => {

    });
    this.taskService.activeTask$.subscribe((task) => {
      if( task && task === this.task) {
        this.isActive = true;
        this.editor = new Editor();
        this.editor.commands.focus().exec();
        setTimeout(() => {
          // @ts-ignore
          // this.editorElement?.elementRef.nativeElement.querySelectorAll('[contenteditable]')[0].click();
        },0);
        //const endPos = this.editor.view.state.doc.content.size;
        //const transaction = this.editor.view.state.tr.setSelection(Selection.atEnd(view.docView.node));

      } else {
        this.isActive = false;
        this.editor.destroy();
      }
    });
  }

  dragEnd($event: DragEvent) {
    this.renderer.setStyle(this.el.nativeElement, 'position', 'absolute');
    this.renderer.setStyle(this.el.nativeElement, 'left', `${$event.clientX - this.clickX}px`);
    this.renderer.setStyle(this.el.nativeElement, 'top', `${$event.clientY - this.clickY}px`);
  }
  dragStart($event: DragEvent) {
    const rect = this.el.nativeElement.getBoundingClientRect();
    this.clickX= $event.clientX - rect.left;
    this.clickY = $event.clientY - rect.top;
    console.log('OffsetX:', this.clickX);
    console.log('OffsetY:', this.clickY);
  }

  destroyEditor(): void {
    this.editor.destroy();
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }
}
