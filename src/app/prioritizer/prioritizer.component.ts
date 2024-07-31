import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Container, Priorities, Priority } from '../../types/types';

@Component({
  selector: 'prioritizer[container]',

  templateUrl: './prioritizer.component.html',
  styleUrl: './prioritizer.component.scss',
})
export class PrioritizerComponent {

    @Input() container!: Container;
    @Input() multipleSelectable: boolean = false;
    @Input() allowEmpty: boolean = false;

    @Output() onPrioritySelected = new EventEmitter<Priority[] | Priority | undefined>();

    protected open: boolean = false;

    availablePriorities: Priority[] = Priorities;

    get priorities(): Priority[] {
      return Array.isArray(this.container.priority) ? this.container.priority : (typeof this.container.priority !== 'undefined' ? [this.container.priority] : []);
    }

    getSymbol(number: number | undefined): string {
      if (number === undefined) return '';
      return '●';
    }

    togglePriority(priority: Priority) {
      let toRet: Priority[] | Priority | undefined;
      if (this.multipleSelectable) {
        let priorities = this.container.priority as Priority[] | undefined;
        priorities = priorities?.includes(priority) ? priorities.filter(s => s !== priority) : (priorities ? [...priorities, priority] : [priority]);
        if (priorities.length === 0 && this.allowEmpty) {
          priorities = undefined;
        }
        toRet = priorities;
      } else {
        toRet = priority;
      }
      this.onPrioritySelected.emit(toRet);
      //this.boardService.publishBoardUpdate();
      this.open = false;
    }
    cancelAndClose() {
      if (this.allowEmpty) {
        this.onPrioritySelected.emit(undefined);
      }
      this.open = false;
    }
    priorityPresent(arg0: Priority): boolean {
      return this.priorities ? this.priorities.includes(arg0) : false;
    }
    existPriorities(): boolean {
      return typeof this.priorities !== 'undefined' && this.priorities.length !== 0;
    }
}
