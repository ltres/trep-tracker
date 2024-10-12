import{ Component, Input }from'@angular/core';
import{ Board }from'../../types/types';
import{ BoardService }from'../../service/board.service';
import{ fadeInOut, slowFadeInOut }from'../../types/animations';

@Component( {
  selector: 'charts[board]', 
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss',
  animations: [fadeInOut, slowFadeInOut]
} )
export class ChartsComponent{
  @Input() board!: Board;
  chartsOpen = false

  constructor(
    protected boardService: BoardService
  ){
    
  }

}
