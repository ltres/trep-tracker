import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Board, Container, Task, Status, Statuses } from '../../types/task';
import { isPlaceholder } from '../../utils/utils';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'status[container][staticLane][board]',
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss'
})
export class StatusComponent implements AfterViewInit {

  @Input() container!: Container;
  @Input() board!: Board;
  @Input() staticLane!: boolean;

  @Input() multipleSelectable: boolean = false;
  @Input() allowEmpty: boolean = false;


  @Output() onStatusSelected = new EventEmitter<Status[]>();

  protected states: Status[] | undefined = [];

  protected open = false;

  constructor(private boardService: BoardService) { }

  ngAfterViewInit(): void {
    this.states = Array.isArray(this.container.status) ? this.container.status : [this.container.status ?? 'todo'];
  }

  toggleStatus(status: Status) {
    if (this.multipleSelectable) {
      this.states = this.states?.includes(status) ? this.states.filter(s => s !== status) : (this.states ? [...this.states, status]: [status]);
    } else {
      this.states = [status];
    }
    this.onStatusSelected.emit(this.states);
    //this.boardService.updateStatus(this.container, status);
    this.open = false;
  }

  isPlaceholder(): boolean {
    if (this.boardService.isTask(this.container)) {
      return isPlaceholder(this.container);
    }
    return false;
  }

  getAvailableStatuses(): Status[] {
    return Object.keys(Statuses) as Status[];
  }

  getSymbol(arg0: Status | undefined): string {
    if (!arg0) return '▫';
    return Statuses[arg0].icon;
  }

  getTooltip(arg0: Status | string): string {
    return arg0.toLowerCase().replaceAll('-', ' ');
  }
  cancelAndClose() {
    if (this.allowEmpty) {
      this.states = undefined;
    }
    this.onStatusSelected.emit(this.states);
    
    this.open = false;
  }

  isTask(arg0: Container<any>) {
    return this.boardService.isTask(arg0);
  }
  isArray(arg0: any) {
    return Array.isArray(arg0);
  }
  hasStatus(_t26: Status): boolean {
    return this.states ? this.states.includes(_t26): false;
  }
}
