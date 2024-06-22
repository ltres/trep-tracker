import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { Container, Priority } from '../../types/task';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'prioritizer[container]',

  templateUrl: './prioritizer.component.html',
  styleUrl: './prioritizer.component.scss'
})
export class PrioritizerComponent {
  @Input() container!: Container;
  protected open: boolean = false;

  constructor(
    private eRef: ElementRef,
    private boardService: BoardService) {
    
  }

  protected priorities = [1,2,3,4,5];

  getArrows(number: number | undefined): string {
    if(number === undefined) return ""
    return "●"
  }

  setPriority(priority: Priority) {
    if( this.container.priority === priority) {
      this.container.priority = undefined
    }else{
      this.container.priority = priority;
    }
    this.boardService.publishBoardUpdate();
    this.open = false;
  }

  
}
