import { Component, HostBinding, Input, TemplateRef, ViewChild } from '@angular/core';
import { BoardService } from '../../service/board.service';
import { Board, Layout, Tag, Task } from '../../types/types';
import { ModalService } from '../../service/modal.service';
import { Observable, map } from 'rxjs';
import { isPlaceholder } from '../../utils/utils';
import { layoutValues } from '../../types/constants';

@Component({
  selector: 'board-toolbar[board][clazz]',
  templateUrl: './board-toolbar.component.html',
  styleUrl: './board-toolbar.component.scss',
})
export class BoardToolbarComponent {
  @ViewChild('gantt') ganttTemplate: TemplateRef<unknown> | null = null;
  @Input() board!: Board;

  @HostBinding('class')
  @Input() clazz!: string;

  debounce: ReturnType<typeof setTimeout> | undefined;
  open: boolean = true;
  menuOpen = false;

  constructor(
    protected boardService: BoardService,
    protected modalService: ModalService,
  ) { }

  getLayouts(): Layout[] {
    return Object.keys(layoutValues) as Layout[];
  }

  setLayout(layout: Layout) {
    this.board.layout = layout;
    this.boardService.publishBoardUpdate();
  }

  debounceBoardUpdate() {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => {
      this.boardService.publishBoardUpdate();
    }, 500);
  }

  updateBoardTags($event: Tag[]) {
    const allOldPresent = this.board.tags.filter(oldTag => $event.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === this.board.tags.length;
    const allNewPresent = $event.filter(oldTag => this.board.tags.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === $event.length;

    if (!allOldPresent || !allNewPresent) {
      this.board.tags = $event;
      this.debounceBoardUpdate();
    }
  }

  addLane() {
    this.boardService.addFloatingLane(this.board,
      window.innerWidth / 2,
      window.innerHeight / 2, [],
      false);
  }

  getLayoutSymbol(layout: Layout) {
    return layoutValues[layout].symbol;
  }

  openGantt() {
    this.modalService.setModalContent(this.ganttTemplate);
    this.modalService.setDisplayModal(true, 'full');
  }

  getGanttTasks$(): Observable<Task[] | undefined> {
    return this.boardService.getTasksForBoard$(this.board).pipe(
      map( tasks => tasks.filter(task => task.includeInGantt  && !isPlaceholder(task) && task.status !== 'archived')),
    );
  }

}
