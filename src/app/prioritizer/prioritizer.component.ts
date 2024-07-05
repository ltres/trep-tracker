import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Container, Priority } from '../../types/task';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'prioritizer[container]',

  templateUrl: './prioritizer.component.html',
  styleUrl: './prioritizer.component.scss'
})
export class PrioritizerComponent {
  @Input() container!: Container;
  @Output() onPrioritySelected = new EventEmitter<Priority | undefined>();

  protected open: boolean = false;

  constructor(
    private eRef: ElementRef,
    private boardService: BoardService) {
    
  }

  protected priorities = [1,2,3,4,5];

  getSymbol(number: number | undefined): string {
    if(number === undefined) return ""
    return "●"
  }

  setPriority(priority: Priority | undefined) {
    this.container.priority = priority;
    this.onPrioritySelected.emit(priority);
    //this.boardService.publishBoardUpdate();
    this.open = false;
  }

  
}
