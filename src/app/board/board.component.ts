import { Component, ElementRef, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Lane, Task } from '../../types/task';
import { TaskComponent } from '../task/task.component';
import { BoardService } from '../../service/board.service';
import { Observable } from 'rxjs';
import { LaneComponent } from '../lane/lane.component';
import { isInside } from '../../utils/utils';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';

@Component({
  selector: 'board',
  //standalone: true,
  //imports: [TaskComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
})
export class BoardComponent implements OnInit {
  @Input() board!: Board;
  @ViewChildren(LaneComponent, { read: ElementRef }) laneComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(LaneComponent,) laneComponents: QueryList<LaneComponent> | undefined;

  constructor(
    private boardService: BoardService,
    private dragService: DragService,
    private keyboardService: KeyboardService,
  ) {
    // this.taskService = taskService;
  }


  get lanes$(): Observable<Lane[]> {
    return this.boardService.getLanes$(this.board);
  }

  ngOnInit() {
    this.dragService.dragEvent$.subscribe(e => {
      //console.log(this.laneComponents)
      let dragEndPos = { x: e?.dragCoordinates.cursorX, y: e?.dragCoordinates.cursorY }
      if (!dragEndPos.x || !dragEndPos.y || !e?.task) {
        return
      }
      let matched = false;
      // lets see if the drop overlaps a lane:
      for (let laneElRef of this.laneComponentsElRefs?.toArray() ?? []) {
        if (isInside(e.dragCoordinates, (laneElRef.nativeElement as HTMLElement).getBoundingClientRect())) {
          let laneComponent = this.laneComponents?.toArray()[this.laneComponentsElRefs!.toArray().indexOf(laneElRef)];
          if (!laneComponent) {
            throw new Error("Cannot find laneComponent")
          }
          let lane = laneComponent.lane
          console.log(`Drag end position is inside lane ${lane}`);
          if (!lane) {
            throw new Error("Cannot find lane")
          }
          // let's understand task overlap as well:
          let taskElRefs = laneComponent.taskComponentsElRefs;
          for (let taskElRef of taskElRefs?.toArray() ?? []) {
            let inside = isInside(e.dragCoordinates, (taskElRef.nativeElement as HTMLElement).getBoundingClientRect())
            if (inside) {
              matched = true;
              let overlappedTask = laneComponent.taskComponents?.toArray()[laneComponent.taskComponentsElRefs?.toArray().indexOf(taskElRef)!].task;
              if (!overlappedTask) {
                throw new Error("Cannot find task")
              }
              this.boardService.addAsSiblings(lane, overlappedTask, this.boardService.selectedTasks, inside === "top-half" ? "before" : "after");
            }
          }
          if (!matched) {
            throw new Error("Cannot find task");
          }


        }
        //console.log(el);
      }
      if (!matched) {
        let newLane = this.boardService.addFloatingLane(this.board, e?.dragCoordinates);
        this.boardService.addAsSiblings(newLane, undefined, this.boardService.selectedTasks);
      }
      //console.log("Grabbed")
    })
    this.keyboardService.keyboardEvent$.subscribe(e => {
      if (e?.type != 'keydown' || !e || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) === -1) {
        return
      }
      let lane = this.boardService.lastSelectedLane;
      let task = this.boardService.lastSelectedTask;
      if (!lane || !task) {
        throw new Error("Cannot find lane or task")
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        let nearby = e?.key === 'ArrowDown' ? this.boardService.getTaskInDirection(lane, [task], "down") : this.boardService.getTaskInDirection(lane, [task], "up");
        if (!nearby) {
          return;
        }
        if (this.keyboardService.isCtrlPressed()) {
          this.boardService.selectTask(lane, nearby);
        } else {
          this.boardService.activateEditorOnTask(lane, nearby);
          this.boardService.clearSelectedTasks();
          this.boardService.selectTask(lane, nearby);
        }
      } else if (e.key === 'ArrowRight') {
        // Make this task a child of the task on the top
        let wannaBeParent = this.boardService.getTaskInDirection(lane, this.boardService.selectedTasks, "up");
        if (!wannaBeParent) {
          throw new Error("Cannot find nearby task")
        }
        this.boardService.addAsChild(wannaBeParent, this.boardService.selectedTasks);
      } else if (e.key === 'ArrowLeft') {
        // Children task gets promoted to the same level as the parent
        let parent = this.boardService.findParent(task);
        if (!parent) {
          throw new Error("Cannot find parent task")
        }
        if(this.boardService.isLane(parent)){
          return;
        }
        this.boardService.removeChildren(parent, this.boardService.selectedTasks);
      }

    });
  }


}
