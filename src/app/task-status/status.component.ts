import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Board, Container, Status } from '../../types/types';
import { isPlaceholder } from '../../utils/utils';
import { BoardService } from '../../service/board.service';
import { statusValues } from '../../types/constants';
import { isTask } from '../../utils/guards';

@Component({
  selector: 'status[container][staticLane][board]',
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss',
})
export class StatusComponent {
  @Input() container!: Container;
  @Input() board!: Board;
  @Input() staticLane!: boolean;
  @Input() tooltip = "Set status";

  @Input() multipleSelectable: boolean = false;
  @Input() allowEmpty: boolean = false;

  @Output() onStatusSelected = new EventEmitter<Status[] | Status | undefined>();

  protected open = false;

  constructor(private boardService: BoardService) { }

  get states(): Status[] {
    return Array.isArray(this.container.status) ? this.container.status : (this.container.status ? [this.container.status] : []);
  }

  toggleStatus(status: Status) {
    let toEmit: Status[] | Status | undefined;
    if (this.multipleSelectable) {
      let states = this.container.status as Status[] | undefined;
      states = states?.includes(status) ? states.filter(s => s !== status) : (states ? [...states, status] : [status]);
      if (states.length === 0 && this.allowEmpty) {
        states = undefined;
      }
      toEmit = states;
    } else {
      toEmit = status;
    }

    this.onStatusSelected.emit(toEmit);
    //this.boardService.updateStatus(this.container, status);
    this.open = false;
  }

  isPlaceholder(): boolean {
    if (isTask(this.container)) {
      return isPlaceholder(this.container);
    }
    return false;
  }

  getAvailableStatuses(): Status[] {
    return Object.keys(statusValues) as Status[];
  }

  getSymbol(arg0: Status | undefined): string {
    if (!arg0) return '▫';
    return statusValues[arg0].icon;
  }

  getTooltip(arg0: Status | string): string {
    return arg0.toLowerCase().replaceAll('-', ' ');
  }
  cancelAndClose() {
    if (this.allowEmpty) {
      this.onStatusSelected.emit(undefined);
    }

    this.open = false;
  }

  isTask(arg0: Container) {
    return isTask(arg0);
  }
  isArray(arg0: object) {
    return Array.isArray(arg0);
  }
  hasStatus(toCheck: Status): boolean {
    return Array.isArray(this.container.status) ? this.container.status.includes(toCheck) : this.container.status === toCheck;
  }
}
