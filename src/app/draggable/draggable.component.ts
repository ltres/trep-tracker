import {
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
export abstract class DraggableComponent extends BaseComponent implements OnInit {
  @Input() static: boolean = false;
  protected _board: Board | undefined;

  private deltaX: number = 0;
  private deltaY: number = 0;

  private resizeObserver = new ResizeObserver(this.onResize.bind(this));
  private resizeTimeout: any;

  @HostBinding('style.left.px')
  private get left(): number {
    return this.object?.coordinates?.x || 0;
  }

  @HostBinding('style.top.px')
  private get top(): number {
    return this.object?.coordinates?.y || 0;
  }

  @HostBinding('style.position')
  private get position(): string | undefined {
    return this.object?.coordinates ? 'fixed' : undefined;
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
  override ngOnInit(): void {
    super.ngOnInit();
    if (this.static) return;
    this.el.nativeElement.setAttribute('draggable', 'true');
    this.resizeObserver.observe(this.el.nativeElement);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.resizeObserver.disconnect();
  }

  abstract get board(): Board | undefined;

  /**
   * If the task was dropped over another, put the task in the same lane after/before that task.
   * Otherwise, create another floating lane
   * @param $event
   */
  @HostListener('dragend', ['$event'])
  onDragEnd($event: DragEvent, parent: Container) {
    if (this.static) return;
    if (!this.object) return;
    if (!this.object.coordinates) this.object.coordinates = { x: 0, y: 0 };

    this.object.coordinates.x = $event.clientX - this.deltaX;
    this.object.coordinates.y = $event.clientY - this.deltaY;

    this.object.coordinates = {
      x: $event.clientX - this.deltaX,
      y: $event.clientY - this.deltaY,
    };
    this.boardService.publishBoardUpdate();

    this.dragService.publishDragEvent(this, $event);
    $event.stopPropagation();
    $event.stopImmediatePropagation();
  }
  @HostListener('drag', ['$event'])
  onDrag($event: DragEvent, parent: Container) {
    if (this.static) return;
    if (!this.object) return;
    if (!this.object.coordinates) this.object.coordinates = { x: 0, y: 0 };
    this.object.coordinates.x = $event.clientX - this.deltaX;
    this.object.coordinates.y = $event.clientY - this.deltaY;

    if ($event.target instanceof Element) {
      $event.dataTransfer?.setDragImage(
        $event.target,
        window.outerWidth,
        window.outerHeight
      );
    }
    $event.stopPropagation();
    $event.stopImmediatePropagation();
  }

  @HostListener('dragstart', ['$event'])
  onDragStart($event: DragEvent) {
    if (this.static) return;
    this.deltaX = $event.clientX - this.el.nativeElement.getBoundingClientRect().left;
    this.deltaY = $event.clientY - this.el.nativeElement.getBoundingClientRect().top;

    //$event.stopPropagation();
    //$event.stopImmediatePropagation();
    if ($event.target instanceof Element) {
      $event.dataTransfer?.setDragImage(
        $event.target,
        window.outerWidth,
        window.outerHeight
      );
    }
    if (!this.object || !this.boardService.isTask(this.object)) return;
    this.boardService.addToSelection(this.object);
  }

  onResize() {
    if (!this.object || !this.boardService.isLane(this.object)) return;
    this.object.width = this.el.nativeElement.getBoundingClientRect().width;

    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.boardService.publishBoardUpdate();
    }, 500);
  }
}
