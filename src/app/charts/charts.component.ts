import{ AfterViewInit, Component, EventEmitter, Input, Output }from'@angular/core';
import{ Board }from'../../types/types';
import{ BoardService }from'../../service/board.service';
import{ fadeInOut, slowFadeInOut }from'../../types/animations';

@Component( {
  selector: 'charts[board]', 
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss',
  animations: [fadeInOut, slowFadeInOut]
} )
export class ChartsComponent implements AfterViewInit{
  @Input() board!: Board;
  chartsOpen = false
  @Output() onInit:EventEmitter<void> = new EventEmitter()

  constructor(
    protected boardService: BoardService
  ){
    
  }
  ngAfterViewInit(): void{
    this.onInit.emit()
  }

}
