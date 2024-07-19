import { Component, Input } from '@angular/core';
import { BoardService } from '../../service/board.service';
import { Board, Layout, Layouts, Tag } from '../../types/task';

@Component({
  selector: 'board-toolbar[board]',
  templateUrl: './board-toolbar.component.html',
  styleUrl: './board-toolbar.component.scss'
})
export class BoardToolbarComponent {
  @Input() board!: Board;
  debounce: any;

  constructor( protected boardService: BoardService ) { }


  getLayouts(): Layout[] {
    return Object.keys(Layouts) as Layout[];
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
      this.boardService.publishBoardUpdate()
    }, 500)
  }

  updateBoardTags($event: Tag[]) {
    let allOldPresent = this.board.tags.filter(oldTag => $event.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === this.board.tags.length
    let allNewPresent = $event.filter(oldTag => this.board.tags.map(t => t.tag.toLowerCase()).find(r => r === oldTag.tag.toLowerCase())).length === $event.length

    if (!allOldPresent || !allNewPresent) {
      this.board.tags = $event;
      this.debounceBoardUpdate()
    }
  }

  addLane() {
    this.boardService.addFloatingLane(this.board,
      window.innerWidth / 2,
      window.innerHeight / 2, [],
      false);
  }

  getLayoutSymbol(layout: Layout) {
    return Layouts[layout].symbol;
  }

}
