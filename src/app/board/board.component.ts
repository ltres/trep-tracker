import { Component, ElementRef, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Lane, Task } from '../../types/task';
import { TaskComponent } from '../task/task.component';
import { BoardService } from '../../service/board.service';
import { Observable } from 'rxjs';
import { LaneComponent } from '../lane/lane.component';
import { isInside } from '../../utils/utils';

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

  constructor(private boardService: BoardService) {
    // this.taskService = taskService;
  }


  get lanes$(): Observable<Lane[]> {
    return this.boardService.getLanes$(this.board);
  }

  ngOnInit() {
    this.boardService.dragEvent$.subscribe(e => {
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
            if ( inside ) {
              matched = true;
              let task = laneComponent.taskComponents?.toArray()[laneComponent.taskComponentsElRefs?.toArray().indexOf(taskElRef)!].task;
              if (!task) {
                throw new Error("Cannot find task")
              }
              this.boardService.addTask(lane, e.task, { how: inside === "top-half" ? "before" : "after", task: task });
            }
          }
          if (!matched) {
            // add to last position
            this.boardService.addTask(lane, e.task);
          }


        }
        //console.log(el);
      }
      if (!matched) {
        this.boardService.addFloatingLane(this.board, e?.task, e?.dragCoordinates);
      }
      //console.log("Grabbed")
    })
  }


}
