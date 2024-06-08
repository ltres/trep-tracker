import { Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output, Renderer2, ViewChild, viewChild } from '@angular/core';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { Board, Lane, Container, Task } from '../../types/task';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { DraggableComponent } from '../draggable/draggable.component';
import { CKEditor4, CKEditorComponent } from 'ckeditor4-angular';

@Component({
  selector: 'task[task][lane][parent][board]',
  //standalone: true,
  //imports: [NgxEditorModule,],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent extends DraggableComponent implements OnInit, OnDestroy {
  @ViewChild(CKEditorComponent) editorComponent: CKEditorComponent | undefined;
  @ViewChild('editor') editor: ElementRef | undefined;
  @Input() task!: Task;
  @Input() lane!: Lane;
  @Input() parent!: Container;

  @Input() board!: Board;

  @Output() createNewTask: EventEmitter<void> = new EventEmitter();

  editorActive: boolean = false;
  selected: boolean = false;
  type: CKEditor4.EditorType = CKEditor4.EditorType.INLINE;

  editorConfig: CKEditor4.Config = {
    extraPlugins: 'divarea',
    // skin: 'prestige,/assets/prestige/',
    skin: 'moono-dark,/assets/moono-dark/',

    toolbarGroups: [
      { name: 'document', groups: ['mode', 'document', 'doctools'] },
      { name: 'clipboard', groups: ['clipboard', 'undo'] },
      { name: 'editing', groups: ['find', 'selection', 'spellchecker', 'editing'] },
      { name: 'forms', groups: ['forms'] },
      { name: 'basicstyles', groups: ['basicstyles', 'cleanup'] },
      { name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph'] },
      { name: 'links', groups: ['links'] },
      { name: 'insert', groups: ['insert'] },
      { name: 'styles', groups: ['styles'] },
      { name: 'colors', groups: ['colors'] },
      { name: 'tools', groups: ['tools'] },
      { name: 'others', groups: ['others'] },
      { name: 'about', groups: ['about'] }
    ],

    removeButtons: 'Source,Save,Templates,NewPage,Preview,Print,Cut,Copy,Paste,PasteText,PasteFromWord,Find,Replace,SelectAll,Scayt,Form,Checkbox,Radio,TextField,Textarea,Select,Button,HiddenField,Subscript,Superscript,CopyFormatting,RemoveFormat,Blockquote,CreateDiv,JustifyBlock,BidiLtr,BidiRtl,Language,Flash,HorizontalRule,Smiley,PageBreak,SpecialChar,Iframe,Styles,Format,Font,FontSize,Maximize,ShowBlocks,About,Undo,Redo,Outdent,Indent,NumberedList,Anchor,Unlink,Link,Image'
  };


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
    if ($event.endsWith('<p></p>')) {
      this.createNewTask.emit();
    }


  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.subscriptions = this.boardService.editorActiveTask$.subscribe((task) => {
      if (task && task.id === this.task.id) {
        this.editorActive = true;

        setTimeout(() => {
          this.editor?.nativeElement.focus();
          //const editorInstance = this.editorComponent?.instance;
          //editorInstance.focus();
        },10)


        
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
    this.boardService.activateEditorOnTask(this.task);
    this.boardService.clearSelectedTasks();
    this.boardService.toggleTaskSelection(this.task);
  }

  selectTask() {
    this.boardService.toggleTaskSelection(this.task);
    this.boardService.activateEditorOnTask(this.task);
  }

  toggleTaskStatus() {
    this.boardService.toggleTaskStatus(this.task);
  }

  hasNextSibling(): boolean {
    return this.parent.children.indexOf(this.task) < this.parent.children.length - 1;
  }

  destroyEditor(): void {
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.destroyEditor();
  }
}
