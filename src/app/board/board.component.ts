import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostBinding, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Container, Lane, Task, getNewTask } from '../../types/task';
import { TaskComponent } from '../task/task.component';
import { BoardService } from '../../service/board.service';
import { Observable, of } from 'rxjs';
import { LaneComponent } from '../lane/lane.component';
import { getCaretPosition } from '../../utils/utils';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { BaseComponent } from '../base/base.component';
import { RegistryService } from '../../service/registry.service';
import { DraggableComponent } from '../draggable/draggable.component';

@Component({
  selector: 'board',
  //standalone: true,
  //imports: [TaskComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent extends BaseComponent implements OnInit, AfterViewInit {
  @Input() board!: Board;
  @ViewChildren(LaneComponent, { read: ElementRef }) laneComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(LaneComponent,) laneComponents: QueryList<LaneComponent> | undefined;

  @HostBinding('style.height.px')
  protected height: number | undefined = 0;

  constructor(
    protected  boardService: BoardService,
    protected  keyboardService: KeyboardService,
    protected override registry: RegistryService,
    protected  dragService: DragService,
    public override el: ElementRef,
    private cdr: ChangeDetectorRef
  ) {
    //super(boardService, dragService, keyboardService, registry,el);
    super(registry, el)
    
    // this.taskService = taskService;
  }
  ngAfterViewInit(): void {
    this.subscriptions = this.boardService.boards$.subscribe(boards => {
      // set the board height basing on the childrens size.
      let boardEl = this.el.nativeElement as HTMLElement;
      let laneEls = boardEl.querySelectorAll('lane');
      setTimeout(() => {
        this.height = 0;
        laneEls.forEach(laneEl => {
          let maxHeight = laneEl.getBoundingClientRect().height + laneEl.getBoundingClientRect().top + window.scrollY;
          if (maxHeight > (this.height??0)) {
            this.height = maxHeight;
          }
        });
      });
      //this.cdr.detectChanges();
    });
    //this.cdr.detectChanges();
  }


  get lanes$(): Observable<Lane[]> {
    return this.boardService.getLanes$(this.board);
  }

  override get object(): Container<any> | undefined {
    return this.board
  }

  addLane() {
    this.boardService.addFloatingLane(this.board, 
      this.el.nativeElement.getBoundingClientRect().width / 2 , 
      this.el.nativeElement.getBoundingClientRect().height / 2, []);
  }

  override ngOnInit() {
    super.ngOnInit();

    this.subscriptions = this.keyboardService.keyboardEvent$.subscribe(e => {
      if (e?.type != 'keydown' || !e || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'].indexOf(e.key) === -1) {
        return
      }
      let task = this.boardService.lastSelectedTask;
      if (!task) {
        throw new Error("Cannot find lane or task")
      }
      let el: Node | undefined;
      this.registry.baseComponentRegistry.forEach(c => {
        if (c.object && c.object.id === task.id && c.object._type === task._type) {
          el = c.el.nativeElement;
        }
      });
      let caretPos = 0;
      if(el) {
        caretPos = getCaretPosition(el);
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        let nearby = e?.key === 'ArrowDown' ? this.boardService.getTaskInDirection(this.boardService.selectedTasks, "down") : this.boardService.getTaskInDirection(this.boardService.selectedTasks, "up");   
        if (!nearby) {
          return;
        }
        let lane = this.boardService.findParentLane([nearby]);
        if (!lane) {
          return;
        }
        if (e.ctrlKey === true) {
          if(e.shiftKey === true) {
            // Move case
            this.boardService.switchPosition(this.boardService.selectedTasks, e.key);
          }else{
            // Select multiple case
            this.boardService.activateEditorOnTask(lane, nearby, caretPos);
            this.boardService.addToSelection(nearby);
          }
        } else {
          // Select next/previous case
          this.boardService.activateEditorOnTask(lane , nearby, caretPos);
          this.boardService.clearSelectedTasks();
          this.boardService.addToSelection(nearby);
        }
      } else if (e.key === 'ArrowRight' && e.ctrlKey === true) {
        // Make this task a child of the task on the top
        let wannaBeParent = this.boardService.getTaskInDirection(this.boardService.selectedTasks, "up");
        if (!wannaBeParent) {
          throw new Error("Cannot find nearby task")
        }
        this.boardService.addAsChild(wannaBeParent, this.boardService.selectedTasks);
      } else if (e.key === 'ArrowLeft' && e.ctrlKey === true) {
        // Children task gets promoted to the same level as the parent
        let parent = this.boardService.findParent(this.boardService.selectedTasks);
        if (!parent) {
          throw new Error("Cannot find parent task")
        }
        if (this.boardService.isLane(parent)) {
          return;
        }
        this.boardService.removeChildrenAndAddAsSibling(parent, this.boardService.selectedTasks);
      }else if(e.key === 'Enter'){
        // Create a new task
        if(!e.ctrlKey || !e.shiftKey){
          return;
        }
        let parent = this.boardService.findParent(this.boardService.selectedTasks);
        if (!parent) {
          throw new Error("Cannot find parent task")
        }
        let task = getNewTask("")
        let lane = this.boardService.isLane(parent) ? parent : this.boardService.findParentLane([parent]);
        if (!lane) {
          return;
        }
        this.boardService.addAsSiblings(parent, this.boardService.lastSelectedTask, [task], "after");
        this.boardService.activateEditorOnTask(lane, task, 0);
        this.boardService.clearSelectedTasks();
        this.boardService.addToSelection(task);
      }

    });
  }


}
