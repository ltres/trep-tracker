import {
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnInit,
} from '@angular/core';
import { BoardService } from '../../service/board.service';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { Board, Container } from '../../types/task';
import { overlaps } from '../../utils/utils';
import { BaseComponent } from '../base/base.component';
import { RegistryService } from '../../service/registry.service';

@Component({
  selector: 'draggable',
  standalone: true,
  imports: [],
  templateUrl: './draggable.component.html',
  styleUrl: './draggable.component.scss',
})
export abstract class DraggableComponent extends BaseComponent implements AfterViewInit, AfterViewChecked {
  @Input() static: boolean = false;
  protected _board: Board | undefined;

  private resizeObserver: ResizeObserver | undefined;
  private resizeTimeout: any;

  private draggableEl: Element | undefined;
  private ancestors: HTMLElement[] | undefined;

  private isBeingDragged: boolean = false;
  
  private deltaX: number = 0;
  private deltaY: number = 0;

  @HostBinding('style.left.px')
  private get left(): number | undefined {
    return this.object?.coordinates?.x;
  }

  @HostBinding('style.top.px')
  private get top(): number | undefined {
    return this.object?.coordinates?.y;
  }

  @HostBinding('style.position')
  private get position(): string | undefined {
    return this.isBeingDragged ? 'fixed' : undefined;
  }

  @HostBinding('style.width.px')
  private get width(): number | undefined {
    return this.boardService.isLane(this.object) ? this.object?.width : undefined;
  }

  constructor(
    protected boardService: BoardService,
    protected dragService: DragService,
    protected keyboardService: KeyboardService,
    protected override registry: RegistryService,
    public override el: ElementRef
  ) {
    super(registry, el);
    if (this.static) return;
    this.subscriptions = this.boardService.parents$.subscribe((parents) => {
      if (!this.object) return;
      let thisObject = parents?.find((parent) =>parent.id === this.object?.id && parent._type === this.object?._type );
    });
  }
  ngAfterViewChecked(): void {
    if( window.getComputedStyle( this.el.nativeElement ).resize === 'horizontal'){
      this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
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

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.resizeObserver?.disconnect();
    delete this.resizeObserver;
  }

  abstract get board(): Board | undefined;

  /**
   * If the task was dropped over another, put the task in the same lane after/before that task.
   * Otherwise, create another floating lane
   * @param $event
   */
  @HostListener('dragend', ['$event'])
  onDragEnd($event: DragEvent, parent: Container) {
    this.isBeingDragged = false;

    if (this.static) return;
    if (!this.object) return;
    this.calcCoordinates(this.object, $event, 'relative'); // no more fixed

    this.boardService.publishBoardUpdate();

    this.dragService.publishDragEvent(this, $event, this.deltaX, this.deltaY);
    $event.stopPropagation();
    $event.stopImmediatePropagation();
  }
  @HostListener('drag', ['$event'])
  onDrag($event: DragEvent, parent: Container) {
    if (this.static) return;
    if (!this.object) return;
    this.calcCoordinates(this.object, $event, 'fixed');

    /*
    if ($event.target instanceof Element) {
      $event.dataTransfer?.setDragImage(
        $event.target,
        window.outerWidth,
        window.outerHeight
      );
    } */
    $event.stopPropagation();
    $event.stopImmediatePropagation();
  }

  @HostListener('dragstart', ['$event'])
  onDragStart($event: DragEvent) {
    this.isBeingDragged = true;
    if (this.static) return;
    if (!this.object) return;
    let node = this.el.nativeElement as HTMLElement;

    this.deltaX = $event.clientX - node.getBoundingClientRect().left;
    this.deltaY = $event.clientY - node.getBoundingClientRect().top;
    this.calcCoordinates(this.object, $event, 'fixed');


    //$event.stopPropagation();
    //$event.stopImmediatePropagation();
    /*
    if ($event.target instanceof Element) {
      $event.dataTransfer?.setDragImage(
        $event.target,
        window.outerWidth,
        window.outerHeight
      );
    }*/
    $event.stopPropagation();
    $event.stopImmediatePropagation(); 
    if (!this.object || !this.boardService.isTask(this.object)) return;
    this.boardService.addToSelection(this.object);
  }

  calcCoordinates(object: Container, $event: DragEvent, position: 'fixed' | 'relative'): void{
    if(!object.coordinates){
      object.coordinates = { x: 0, y: 0 }
    };

    let node = this.el.nativeElement as HTMLElement;

    object.coordinates.x = $event.clientX - this.deltaX + (position === 'relative' ? window.scrollX : 0);
    object.coordinates.y = $event.clientY - this.deltaY + (position === 'relative' ? window.scrollY : 0);
    // console.warn( "step 1",this.object!.coordinates ); 
    /*
    if( !this.ancestors){
      this.ancestors = [];
      let parent: HTMLElement | null;
      while( ( parent = node.parentElement ) != null ){
        if( window.getComputedStyle(parent).position === 'absolute' || window.getComputedStyle(parent).position === 'relative' ){
          this.ancestors.push(parent);
        }
        node = parent; 
      }
    }

    
    this.ancestors.forEach( (ancestor) => {
      this.object!.coordinates!.x -= ancestor.getBoundingClientRect().left //+ window.scrollX;
      this.object!.coordinates!.y -= ancestor.getBoundingClientRect().top //+ window.scrollY;
    }) 
      */
    //console.warn(  "step 2",this.object!.coordinates );
  }
  

  onResize($event: ResizeObserverEntry[]) {
    if (!this.object || !this.boardService.isLane(this.object)) return;
    if( this.object?.width === $event[0].contentRect.width ){
      return
    };
    this.object.width = this.el.nativeElement.getBoundingClientRect().width;

    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.boardService.publishBoardUpdate();
    }, 500);
  }
}
