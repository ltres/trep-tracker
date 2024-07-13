import { AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, forwardRef, HostBinding, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Board, Container, Lane, Tag, Task, getNewTask } from '../../types/task';
import { TaskComponent } from '../task/task.component';
import { BoardService } from '../../service/board.service';
import { Observable, of } from 'rxjs';
import { LaneComponent } from '../lane/lane.component';
import { getCaretPosition, hashCode, isPlaceholder } from '../../utils/utils';
import { DragService } from '../../service/drag.service';
import { KeyboardService } from '../../service/keyboard.service';
import { ContainerComponent } from '../base/base.component';
import { ContainerComponentRegistryService } from '../../service/registry.service';

@Component({
  selector: 'board',
  //standalone: true,
  //imports: [TaskComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: ContainerComponent, useExisting: forwardRef(() => BoardComponent)}
  ]
})
export class BoardComponent extends ContainerComponent implements OnInit, AfterViewInit {

  @Input() board!: Board;
  @ViewChildren(LaneComponent, { read: ElementRef }) laneComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren(LaneComponent,) laneComponents: QueryList<LaneComponent> | undefined;

  @HostBinding('style.height.px')
  protected height: number | undefined = 0;

  @HostBinding('style.width.px')
  protected width: number | undefined = 0;
  debounce: any;

  constructor(
    protected boardService: BoardService,
    protected keyboardService: KeyboardService,
    protected override registry: ContainerComponentRegistryService,
    protected dragService: DragService,
    public override el: ElementRef,
    private cdr: ChangeDetectorRef
  ) {
    //super(boardService, dragService, keyboardService, registry,el);
    super(registry, el)
    
    // this.taskService = taskService;
  }
  override ngOnInit(): void {
    this.boardService.boards$.subscribe(boards => {
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.subscriptions = this.boardService.boards$.subscribe(boards => {
      // set the board height basing on the childrens size.
      let boardEl = this.el.nativeElement as HTMLElement;
      let laneEls = boardEl.querySelectorAll('lane');
      setTimeout(() => {
        this.height = 0;
        this.width = 0;
        laneEls.forEach(laneEl => {
          let maxHeight = laneEl.getBoundingClientRect().height + laneEl.getBoundingClientRect().top + window.scrollY;
          if (maxHeight > (this.height ?? 0)) {
            this.height = maxHeight;
          }
          let maxWidth = laneEl.getBoundingClientRect().width + laneEl.getBoundingClientRect().left + window.scrollX;
          if (maxWidth > (this.width ?? 0)) {
            this.width = maxWidth;
          }
        });
      });
      //this.cdr.detectChanges();
    });
    //this.cdr.detectChanges();
  }

  get lanes$(): Observable<Lane[]> {
    return this.boardService.getLanes$(this.board);
  }

  override get container(): Container<any>{
    return this.board
  }

  addLane() {
    this.boardService.addFloatingLane(this.board,
      this.el.nativeElement.getBoundingClientRect().width / 2,
      this.el.nativeElement.getBoundingClientRect().height / 2, [],
      false);
  }

  updateBoardTags($event: Tag[]) {
    let allOldPresent = this.board.tags.filter(oldTag => $event.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === this.board.tags.length
    let allNewPresent = $event.filter(oldTag => this.board.tags.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === $event.length

    if (!allOldPresent || !allNewPresent) {
      this.board.tags = $event;
      this.debounceBoardUpdate()
    }
  }

  debounceBoardUpdate() {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => {
      this.boardService.publishBoardUpdate()
    }, 500)
  }

  trackBy(index: number, lane: Lane): number {
    return hashCode(lane.id);
  }


}
