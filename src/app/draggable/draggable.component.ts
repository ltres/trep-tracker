import { Component, ElementRef } from '@angular/core';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { Container } from '../../types/task';

@Component({
  selector: 'draggable',
  standalone: true,
  imports: [],
  templateUrl: './draggable.component.html',
  styleUrl: './draggable.component.scss'
})
export class DraggableComponent {
  protected object!: Container;

  constructor(
    protected boardService: BoardService, 
    protected dragService: DragService,
    protected keyboardService: KeyboardService,
    protected el: ElementRef) {
      this.dragService.overlapCheckRequest$.subscribe( rect => {
        this.dragService.publishOverlapMatchResponse(this.object, this);;
      });
  }

  /**
   * If the task was dropped over another, put the task in the same lane after/before that task.
   * Otherwise, create another floating lane
   * @param $event 
   */
  onDragEnd($event: DragEvent, parent: Container) {
    this.dragService.publishDragEvent(parent, $event);
  }

  onDragStart($event: DragEvent) {
     $event.stopPropagation();
    $event.stopImmediatePropagation();
  }

}
