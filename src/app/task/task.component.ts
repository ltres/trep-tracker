import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
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
  @Input() task: Task | undefined;
  @Output() createNewTask: EventEmitter<void> = new EventEmitter();
  isActive = false;
  editor!: Editor;
  html = '';

  constructor(private taskService: TaskService) {

  }

  editorChange($event: string) {
    // console.log($event)
    if($event.endsWith('<p></p>')) {
      this.editor.setContent($event.replace('<p></p>', ''));
      this.createNewTask.emit();
    }
  }

  destroyEditor(): void {
    this.editor.destroy();
  }

  ngOnInit(): void {
    this.taskService.tasks$.subscribe((tasks) => {

    });
    this.taskService.activeTask$.subscribe((task) => {
      if( task && task === this.task) {
        this.isActive = true;
        this.editor = new Editor();
        this.editor.commands.focus().exec();
      } else {
        this.isActive = false;
        this.editor.destroy();
      }
    });
  }
  

  ngOnDestroy(): void {
    this.destroyEditor();
  }
}
