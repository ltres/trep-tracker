import { Component, Input } from '@angular/core';
import { Container } from '../../types/task';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'prioritizer[container]',

  templateUrl: './prioritizer.component.html',
  styleUrl: './prioritizer.component.scss'
})
export class PrioritizerComponent {
  @Input() container!: Container;

  constructor(private boardService: BoardService) {
    
  }

  protected priorities = [1,2,3,4,5];

  setPriority(priority: 1 | 2 | 3 | 4) {
    if( this.container.priority === priority) {
      this.container.priority = undefined
    }else{
      this.container.priority = priority;
    }
    this.boardService.publishBoardUpdate();
  }
}
