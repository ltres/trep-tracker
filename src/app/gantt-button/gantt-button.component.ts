import{ Component, Input, TemplateRef, ViewChild }from'@angular/core';
import{ Observable, map }from'rxjs';
import{ ModalService }from'../../service/modal.service';
import{ BoardService }from'../../service/board.service';
import{ Board, Task }from'../../types/types';

@Component( {
  selector: 'gantt-button[board]',
  templateUrl: './gantt-button.component.html',
  styleUrl: './gantt-button.component.scss'
} )
export class GanttButtonComponent{
  @Input() board!: Board;
  @ViewChild( 'gantt' ) ganttTemplate: TemplateRef<unknown> | null = null;

  constructor(
    private boardService: BoardService,
    protected modalService: ModalService,
  ){ }
  openGantt(){
    this.modalService.setModalContent( this.ganttTemplate );
    this.modalService.setDisplayModal( true, 'full' );
  }

  getGanttTasks$(): Observable<Task[] | undefined>{
    return this.boardService.getTasksForBoard$( this.board ).pipe(
      map( tasks => this.boardService.getTasksForGantt( tasks ) ),
    );
  }

}
