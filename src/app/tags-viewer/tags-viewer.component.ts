import{ Component, Input }from'@angular/core';
import{ BoardService }from'../../service/board.service';
import{ TagService }from'../../service/tag.service';
import{ Board, Lane }from'../../types/types';

@Component( {
  selector: 'tags-viewer[board]',
  templateUrl: './tags-viewer.component.html',
  styleUrl: './tags-viewer.component.scss',
} )
export class TagsViewerComponent{
  @Input() board!: Board;
  @Input() lane: Lane | undefined;

  constructor(
    private boardService: BoardService,
    protected tagService: TagService,
  ){ }

}
