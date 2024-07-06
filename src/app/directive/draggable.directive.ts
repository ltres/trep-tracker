import {
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  NgZone,
  OnInit,
  Output,
} from '@angular/core';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { Board, Container } from '../../types/task';
import { overlaps } from '../../utils/utils';
import { BaseComponent } from '../base/base.component';
import { RegistryService } from '../../service/registry.service';

@Directive({
  selector: '[draggableDir]',
})
export class DraggableDirective implements AfterViewInit, AfterViewChecked {
  @Input() static: boolean = false;

  protected coordinates: { x: number; y: number } = {
    x: 0,
    y: 0
  };

  protected _width: number = 0;

  protected _board: Board | undefined;

  private resizeObserver: ResizeObserver | undefined;
  private resizeTimeout: any;

  private draggableEl: Element | undefined;

  private isBeingDragged: boolean = false;

  private deltaX: number = 0;
  private deltaY: number = 0;

  @HostBinding('style.left.px')
  private get left(): number | undefined {
    return this.coordinates.x;
  }

  @HostBinding('style.top.px')
  private get top(): number | undefined {
    return this.coordinates.y;
  }

  @Output() onDragEnd: EventEmitter<DragEvent> = new EventEmitter();
  @Output() onResize: EventEmitter<number> = new EventEmitter();

  /*
  @HostBinding('style.position')
  private get position(): string | undefined {
    return this.isBeingDragged ? 'fixed' : undefined;
  }*/

  @HostBinding('style.width.px')
  private get width(): number | undefined {
    return this._width;
  }
  private set width(value: number) {
    this._width = value;
  }

  constructor(
    public el: ElementRef,
    private ngZone: NgZone
  ) {

  }

  ngAfterViewChecked(): void {
    if (window.getComputedStyle(this.el.nativeElement).resize === 'horizontal' && !this.resizeObserver) {
      //this.resizeObserver = new ResizeObserver(this.resize.bind(this));
      //this.resizeObserver.observe(this.el.nativeElement);
    }
  }

  ngAfterViewInit(): void {
    //super.ngOnInit();
    if (this.static) return;
    let el = this.el.nativeElement as HTMLElement;
    this.draggableEl = el.querySelector("[drag-on-this]:not([draggable])") ?? el;
    this.draggableEl.setAttribute('draggable', 'true');
  }

  ngOnDestroy(): void {
    if (!this.resizeObserver) return;
    this.resizeObserver?.disconnect();
    delete this.resizeObserver;
  }

  /**
   * If the task was dropped over another, put the task in the same lane after/before that task.
   * Otherwise, create another floating lane
   * @param $event
   */
  @HostListener('dragend', ['$event'])
  dragEnd($event: DragEvent, parent: Container) {
    this.ngZone.runOutsideAngular(() => {
      // if(1===1)return;
      this.isBeingDragged = false;
      let node = this.el.nativeElement as HTMLElement;
      node.style.position = "";

      if (this.static) return;
      this.calcCoordinates($event, 'relative'); // no more fixed
      this.onDragEnd.emit($event);
      $event.stopPropagation();
      $event.stopImmediatePropagation();
    });
  }
  @HostListener('drag', ['$event'])
  drag($event: DragEvent, parent: Container) {
    this.ngZone.runOutsideAngular(() => {
      //if(1===1)return;
      if (this.static) return;
      this.calcCoordinates($event, 'fixed');
      $event.stopPropagation();
      $event.stopImmediatePropagation();
    });
  }

  @HostListener('dragstart', ['$event'])
  dragStart($event: DragEvent) {
    this.ngZone.runOutsideAngular(() => {
      // if(1===1)return;
      this.isBeingDragged = true;
      if (this.static) return;

      let node = this.el.nativeElement as HTMLElement;

      this.deltaX = $event.clientX - node.getBoundingClientRect().left;
      this.deltaY = $event.clientY - node.getBoundingClientRect().top;
      node.style.position = 'fixed';
      node.style.zIndex = "100";
      this.calcCoordinates($event, 'fixed');

      $event.stopPropagation();
      $event.stopImmediatePropagation();
    });
  }

  calcCoordinates($event: DragEvent, position: 'fixed' | 'relative'): void {
    this.coordinates.x = $event.clientX - this.deltaX + (position === 'relative' ? window.scrollX : 0);
    this.coordinates.y = $event.clientY - this.deltaY + (position === 'relative' ? window.scrollY : 0);
  }


  resize($event: ResizeObserverEntry[]) {
    if (this.width === $event[0].contentRect.width || $event[0].contentRect.width === 0) {
      return
    };
    this.width = this.el.nativeElement.getBoundingClientRect().width;

    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.onResize.emit(this.width);
    }, 500);
  }
}
