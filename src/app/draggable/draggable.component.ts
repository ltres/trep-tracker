import { AfterViewInit, Component, ElementRef, HostListener } from '@angular/core';
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
export abstract class DraggableComponent implements AfterViewInit {
  protected _object: Container | undefined;

  private deltaX: number = 0;
  private deltaY: number = 0;

  constructor(
    protected boardService: BoardService,
    protected dragService: DragService,
    protected keyboardService: KeyboardService,
    public el: ElementRef) {
    this.dragService.overlapCheckRequest$.subscribe(rect => {
      this.dragService.publishOverlapMatchResponse(this.object, this);;
    });
  }
  ngAfterViewInit(): void {
    this.el.nativeElement.setAttribute('draggable', 'true');
    if (!this.object || !this.object.coordinates) return;
    this.el.nativeElement.style.left = this.object.coordinates.x + 'px';
    this.el.nativeElement.style.top = this.object.coordinates.y + 'px';
    this.el.nativeElement.style.position = 'fixed';
  }
  abstract get object(): Container | undefined;

  /**
   * If the task was dropped over another, put the task in the same lane after/before that task.
   * Otherwise, create another floating lane
   * @param $event 
   */
  @HostListener('dragend', ['$event'])
  onDragEnd($event: DragEvent, parent: Container) {
    this.el.nativeElement.style.left = ($event.clientX - this.deltaX) + 'px';
    this.el.nativeElement.style.top = ($event.clientY - this.deltaY) + 'px';
    this.el.nativeElement.style.position = 'fixed';
    this.dragService.publishDragEvent(this, $event);
    $event.stopPropagation();
    $event.stopImmediatePropagation();
    if (!this.object) return;
    this.object.coordinates = { x: $event.clientX - this.deltaX, y: $event.clientY - this.deltaY };
    this.boardService.publishBoardUpdate();
  }
  @HostListener('drag', ['$event'])
  onDrag($event: DragEvent, parent: Container) {
    this.el.nativeElement.style.left = ($event.clientX - this.deltaX) + 'px';
    this.el.nativeElement.style.top = ($event.clientY - this.deltaY) + 'px';
    this.el.nativeElement.style.position = 'fixed';
    if ($event.target instanceof Element) {
      $event.dataTransfer?.setDragImage($event.target, window.outerWidth, window.outerHeight);
    }
    $event.stopPropagation();
    $event.stopImmediatePropagation();

  }

  @HostListener('dragstart', ['$event'])
  onDragStart($event: DragEvent) {
    this.deltaX = $event.clientX - this.el.nativeElement.getBoundingClientRect().left,
      this.deltaY = $event.clientY - this.el.nativeElement.getBoundingClientRect().top;
    $event.stopPropagation();
    $event.stopImmediatePropagation();
    if ($event.target instanceof Element) {
      $event.dataTransfer?.setDragImage($event.target, window.outerWidth, window.outerHeight);
    }
  }

}
