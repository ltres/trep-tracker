import { Component, ElementRef, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Lane, Task } from '../../types/task';
import { TaskComponent } from '../task/task.component';
import { BoardService } from '../../service/board.service';
import { Observable } from 'rxjs';
import { LaneComponent } from '../lane/lane.component';

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
  @ViewChildren(LaneComponent, ) laneComponents: QueryList<LaneComponent> | undefined;

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
      for (let laneComponent of this.laneComponentsElRefs?.toArray() ?? []) {
        let DOMRect = laneComponent.nativeElement.getBoundingClientRect();
        if (DOMRect.x < dragEndPos.x && dragEndPos.x < DOMRect.x + DOMRect.width &&
          DOMRect.y < dragEndPos.y && dragEndPos.y < DOMRect.y + DOMRect.height
        ) {
          console.log(`Drag end position is inside element ${laneComponent}`);
          let lane = this.laneComponents?.toArray()[this.laneComponentsElRefs!.toArray().indexOf(laneComponent)].lane
          if(!lane){
            throw new Error("Cannot find lane")
          }
          this.boardService.addTask( lane, e.task );
          matched = true;
        }
        //console.log(el);
      }
      if( !matched){
        this.boardService.addFloatingLane( this.board, e?.task,  e?.dragCoordinates );
      }
      //console.log("Grabbed")
    })
  }

}
