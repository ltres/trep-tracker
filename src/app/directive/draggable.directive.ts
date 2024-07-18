import {
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  Component,
  ComponentFactoryResolver,
  Directive,
  ElementRef,
  EventEmitter,
  Host,
  HostBinding,
  HostListener,
  Input,
  NgZone,
  OnInit,
  Optional,
  Output,
} from '@angular/core';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { Board, Container, Lane, Layout } from '../../types/task';
import { overlaps } from '../../utils/utils';
import { ContainerComponent } from '../base/base.component';
import { ContainerComponentRegistryService } from '../../service/registry.service';

@Directive({
  selector: '[draggableDir][containerEl][layout]',
})
export class DraggableDirective implements AfterViewInit, AfterViewChecked {
  @Input() static: boolean = false;
  @Input() displayedInFixedLayout: boolean = false;

  @Input() draggableDir!: Container | Lane;
  @Input() containerEl!: HTMLElement
  @Input() layout!: Layout;

  private resizeObserver: ResizeObserver | undefined;
  private resizeTimeout: any;
  private draggableEl: Element | undefined;
  private isBeingDragged: boolean = false;
  private deltaX: number = 0;
  private deltaY: number = 0;

  @HostBinding('style.left.px')
  private get left(): number | undefined {
    return this.draggableDir.coordinates?.x;
  }

  @HostBinding('style.top.px')
  private get top(): number | undefined {
    return this.draggableDir.coordinates?.y;
  }

  @Output() onDragStart: EventEmitter<DragEvent> = new EventEmitter();
  @Output() onDragEnd: EventEmitter<DragEvent> = new EventEmitter();
  @Output() onResize: EventEmitter<number | string | undefined> = new EventEmitter();

  @HostBinding('class.dragged')
  private get dragged(): string | undefined {
    return this.isBeingDragged ? 'dragged' : "";
  }

  @HostBinding('style.width')
  private get width(): number | string | undefined {
    return this.displayedInFixedLayout && !this.isBeingDragged ? '100%' : (this.boardService.isLane(this.draggableDir )? (this.draggableDir.layouts[this.layout].width ?? 0) + "px" : "100%");
  }
  
  private set width(value: number ) {
    this.boardService.isLane(this.draggableDir) ? this.draggableDir.layouts[this.layout].width = value : undefined;
  }

  constructor(
    public el: ElementRef,
    private ngZone: NgZone,
    private dragService: DragService,
    private boardService: BoardService,
    private host: ContainerComponent
  ) {

  }

  ngAfterViewChecked(): void {
    if (!this.displayedInFixedLayout && window.getComputedStyle(this.el.nativeElement).resize === 'horizontal' && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(this.resize.bind(this));
      this.resizeObserver.observe(this.el.nativeElement);
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
      document.body.classList.remove('dragging');

      this.draggableDir.coordinates = this.calcRelativeCoordinates($event);
      this.boardService.publishBoardUpdate()

      let board = this.boardService.selectedBoard;
      if( !board ) return;
      this.dragService.publishDragEvent(
        this.draggableDir,
        this.host,
        $event,
        this.deltaX,
        this.deltaY,
        board
      )

      this.onDragEnd.emit($event);
      $event.stopPropagation();
      $event.stopImmediatePropagation();
    });
  }
  @HostListener('drag', ['$event'])
  drag($event: DragEvent, parent: Container) {
    this.ngZone.runOutsideAngular(() => {
      if (this.static) return;
      this.draggableDir.coordinates = this.calcRelativeCoordinates($event);
      $event.stopPropagation();
      $event.stopImmediatePropagation();
    });
  }

  @HostListener('dragstart', ['$event'])
  dragStart($event: DragEvent) {
    this.ngZone.runOutsideAngular(() => {
      if(this.boardService.isLane(this.draggableDir)){
        this.draggableDir.layouts[this.layout].width = this.el.nativeElement.getBoundingClientRect().width;
      }
      this.isBeingDragged = true;
      if (this.static) return;
      document.body.classList.add('dragging');

      let node = this.el.nativeElement as HTMLElement;
      this.onDragStart.emit($event);
      this.deltaX = $event.clientX - node.getBoundingClientRect().left;
      this.deltaY = $event.clientY - node.getBoundingClientRect().top;
      node.style.position = 'absolute';
      node.style.zIndex = "100";
      
      this.draggableDir.coordinates = this.calcRelativeCoordinates($event);

      
      $event.stopPropagation();
      $event.stopImmediatePropagation();
    });
  }

  /**
   * Calculates the relative coordinates of the drag event within the specified element.
   * @param $event - The drag event.
   * @param el - The HTML element.
   * @returns An object containing the x and y coordinates relative to the element's position.
   */
  calcRelativeCoordinates($event: DragEvent): { x:number, y:number } {
    return {
      x: $event.clientX - this.deltaX - this.containerEl.getBoundingClientRect().left, 
      y: $event.clientY - this.deltaY - this.containerEl.getBoundingClientRect().top
    }
  }


  resize($event: ResizeObserverEntry[]) {
    if (this.width?.toString().indexOf($event[0].contentRect.width.toString()) === 0 || $event[0].contentRect.width === 0) {
      return
    };
    this.width = this.el.nativeElement.getBoundingClientRect().width;

    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.onResize.emit(this.width);
      this.boardService.publishBoardUpdate();
    }, 500);
  }
}
