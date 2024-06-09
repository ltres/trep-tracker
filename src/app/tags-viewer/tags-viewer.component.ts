import { Component } from '@angular/core';
import { BoardService } from '../../service/board.service';
import { TagService } from '../../service/tag.service';

@Component({
  selector: 'tags-viewer',
  templateUrl: './tags-viewer.component.html',
  styleUrl: './tags-viewer.component.scss'
})
export class TagsViewerComponent {

  constructor(
    private boardService: BoardService,
    protected tagService: TagService
  ) { }
  
  
}
