import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Board, Container, Task, Status, Statuses } from '../../types/task';
import { isPlaceholder } from '../../utils/utils';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'status[container][staticLane][board]',
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss'
})
export class StatusComponent {


  @Input() container!: Container;
  @Input() board!: Board;
  @Input() staticLane!: boolean;
  @Input() allowUndefinedStatus = false;


  @Output() onStatusSelected = new EventEmitter<Status>();
  @Output() onArchiveToggle = new EventEmitter<boolean>();

  protected open = false;

  constructor(private boardService: BoardService) { }

  toggleArchive() {
    if(this.boardService.isTask(this.container)){
      //this.boardService.archive(this.board, this.container)
      this.onArchiveToggle.emit(!this.container.archived);
    }
  }
  updateStatus(status: Status) {
    this.onStatusSelected.emit(status); 
    //this.boardService.updateStatus(this.container, status);
    this.open = false;
  }

  isPlaceholder(): boolean {
    if(this.boardService.isTask(this.container)){
      return isPlaceholder(this.container);
    }
    return false;
  }

  getAvailableStatuses(): Status[] {
    return Object.keys(Statuses) as Status[];
  }

  getSymbol(arg0: Status | undefined): string {
    if(!arg0) return '▫';
    return Statuses[arg0].icon;
  }

  getTooltip(arg0: Status | string): string {
    return arg0.toLowerCase().replaceAll('-', ' ');
  }
  cancelAndClose() {
    if(this.allowUndefinedStatus){
      this.onStatusSelected.emit(undefined);
    }
    this.open = false;
  }

  isTask(arg0: Container<any>) {
    return this.boardService.isTask(arg0);
  }

}
