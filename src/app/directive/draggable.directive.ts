import {
  AfterViewChecked,
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  Output,
} from '@angular/core';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { Container, Lane, Layout } from '../../types/types';
import { ContainerComponent } from '../base/base.component';
import { isLane } from '../../utils/guards';
import { dragStartTreshold } from '../../types/constants';
import { Subscription, take } from 'rxjs';

@Directive({
  selector: '[draggableDir][containerEl][layout]',
})
export class DraggableDirective implements AfterViewChecked, AfterViewInit {
  @Input() static: boolean = false;
  @Input() displayedInFixedLayout: boolean = false;

  @Input() draggableDir!: Container | Lane;
  @Input() containerEl!: HTMLElement;
  @Input() layout!: Layout;

  private resizeObserver: ResizeObserver | undefined;
  private resizeTimeout: ReturnType<typeof setTimeout> | undefined;

  private deltaX: number = 0;
  private deltaY: number = 0;

  private initialCursorX: number = 0;
  private initialCursorY: number = 0;

  @Output() onDragStart: EventEmitter<DragEvent> = new EventEmitter();
  @Output() onDragEnd: EventEmitter<DragEvent> = new EventEmitter();
  @Output() onResize: EventEmitter<number | string | undefined> = new EventEmitter();

  dragCheckSub: Subscription | undefined;

  constructor(
    public el: ElementRef,
    private ngZone: NgZone,
    private dragService: DragService,
    private boardService: BoardService,
    private host: ContainerComponent,
  ){}

  /**
   * Initialize persisted width for non-absolute layouts
   */
  ngAfterViewInit(): void {

    if(this.layout !== 'absolute'){
      (this.el.nativeElement as HTMLElement).style.width = '100%';
    }else if(isLane(this.draggableDir) && this.draggableDir.layouts[this.layout].width){
      (this.el.nativeElement as HTMLElement).style.width = this.draggableDir.layouts[this.layout].width + 'px';
      (this.el.nativeElement as HTMLElement).style.top = this.draggableDir.coordinates?.y + 'px';
      (this.el.nativeElement as HTMLElement).style.left = this.draggableDir.coordinates?.x + 'px'
    }
  }

  /**
   * Initialize resize observers
   */
  ngAfterViewChecked(): void {
    if (!this.displayedInFixedLayout && window.getComputedStyle(this.el.nativeElement).resize === 'horizontal' && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(this.resize.bind(this));
      this.resizeObserver.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (!this.resizeObserver) return;
    this.resizeObserver?.disconnect();
    delete this.resizeObserver;
  }

  /**
   * Announce the end of the drag event
   * @param $event
   */
  @HostListener('dragend', ['$event'])
  dragEnd($event: DragEvent) {

    this.ngZone.runOutsideAngular(() => {
      const node = this.el.nativeElement as HTMLElement;
      if (this.static) return;

      this.dragService.dragChecksEnded$.pipe(take(1)).subscribe( () => {
        // Element will pass from a fixed layout (positioned relative to the viewport) to an absolute layout (positioned to the container). We need to account for the window scroll in order to position correctly if the viewport is scrolled
        node.style.position = '';
        node.style.zIndex = "";
        
        node.style.top = ($event.clientY - this.deltaY + window.scrollY) + 'px';
        node.style.left = ($event.clientX - this.deltaX + window.scrollX) + 'px';
        
        document.body.classList.remove('dragging');
  
        // persist the new element position for this layout:
        if(isLane(this.draggableDir) && this.layout === 'absolute'){
          this.draggableDir.coordinates = {
            x: ($event.clientX - this.deltaX + window.scrollX),
            y: ($event.clientY - this.deltaY + window.scrollY),
          }
          this.boardService.publishBoardUpdate()
        }
      })

      const board = this.boardService.selectedBoard;
      if( !board ) return;
      this.dragService.publishDragEndEvent(
        this.draggableDir,
        this.host,
        $event,
        this.deltaX,
        this.deltaY,
        board,
      );

      this.onDragEnd.emit($event);

      $event.stopPropagation();
      $event.stopImmediatePropagation();
    });
    
  }

  /**
   * Whenever dragStartTreshold has been reached, announce the start of the drag event
   * @param $event 
   */
  @HostListener('drag', ['$event'])
  drag($event: DragEvent) {
    this.moveToCursor($event);

    const movedY = this.initialCursorY - $event.clientY
    const movedX = this.initialCursorX - $event.clientX

    if( Math.sqrt( Math.pow(movedY,2) + Math.pow(movedX,2) ) > dragStartTreshold ){
      // cursor has moved for a certain treshold, publish the drag event
      this.onDragStart.emit($event);
      this.dragService.publishDragStartEvent(this.draggableDir)
    }

    this.dragService.publishDraggingCoordinates($event.clientX, $event.clientY, this.draggableDir );

    $event.stopPropagation();
    $event.stopImmediatePropagation();
  }

  /**
   * Drag has started. Store cursor position and initial container delta so to have a precise positioning of the dragged element
   * @param $event 
   */
  @HostListener('dragstart', ['$event'])
  dragStart($event: DragEvent) {
    this.ngZone.runOutsideAngular(() => {
      if (this.static) return;
      document.body.classList.add('dragging');

      const node = this.el.nativeElement as HTMLElement;
      this.deltaX = $event.clientX  - node.getBoundingClientRect().left;
      this.deltaY = $event.clientY  - node.getBoundingClientRect().top;
      this.initialCursorX = $event.clientX;
      this.initialCursorY = $event.clientY;
      
      node.style.width = node.getBoundingClientRect().width + 'px';
      node.style.position = 'fixed';
      node.style.zIndex = "9999";

      this.moveToCursor($event)

      $event.stopPropagation();
      $event.stopImmediatePropagation();
    });
  }

  /**
   * Traslate the element under the cursor, keeping the initial click point in consideration
   * @param $event 
   */
  private moveToCursor($event: DragEvent){
    const node = this.el.nativeElement as HTMLElement;
    node.style.top = ($event.clientY - this.deltaY) + 'px';
    node.style.left = ($event.clientX - this.deltaX) + 'px';
  }

  resize($event: ResizeObserverEntry[]) {
    if(!isLane(this.draggableDir)){
      throw new Error("Cannot resize non-lanes");
    }

    const currentStoredWidth = (this.draggableDir as Lane).layouts[this.layout].width;

    if (currentStoredWidth === $event[0].contentRect.width || $event[0].contentRect.width === 0) {
      return;
    };

    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      (this.draggableDir as Lane).layouts[this.layout].width = this.el.nativeElement.getBoundingClientRect().width
      this.onResize.emit(this.el.nativeElement.getBoundingClientRect().width);
      this.boardService.publishBoardUpdate();
    }, 500);
  }
}
