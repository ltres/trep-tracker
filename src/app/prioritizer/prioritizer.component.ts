import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Container, Priorities, Priority } from '../../types/types';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'prioritizer[container]',

  templateUrl: './prioritizer.component.html',
  styleUrl: './prioritizer.component.scss'
})
export class PrioritizerComponent{

  @Input() container!: Container;
  @Input() multipleSelectable: boolean = false;
  @Input() allowEmpty: boolean = false;

  @Output() onPrioritySelected = new EventEmitter<Priority[] | Priority | undefined>();
  
  protected open: boolean = false;

  availablePriorities: Priority[] = Priorities;

  get priorities(): Priority[] {
    return Array.isArray(this.container.priority) ? this.container.priority : (this.container.priority ? [this.container.priority] : []);
  }

  getSymbol(number: number | undefined): string {
    if(number === undefined) return ""
    return "●"
  }

  togglePriority(priority: Priority) {
    if (this.multipleSelectable) {
      let priorities = this.container.priority as Priority[] | undefined;
      priorities = priorities?.includes(priority) ? priorities.filter(s => s !== priority) : (priorities ? [...priorities, priority]: [priority]);
      if(priorities.length === 0 && this.allowEmpty) {
        priorities = undefined;
      }
      this.container.priority = priorities
    } else {
      this.container.priority = priority;
    }
    this.onPrioritySelected.emit(this.container.priority);
    //this.boardService.publishBoardUpdate();
    this.open = false;
  }
  cancelAndClose(){
    if(this.allowEmpty){
      this.container.priority = undefined;
    }
    this.onPrioritySelected.emit(this.container.priority);
    this.open = false;
  }
  priorityPresent(arg0: Priority): boolean {
    return this.priorities ? this.priorities.includes(arg0): false;
  }
}
