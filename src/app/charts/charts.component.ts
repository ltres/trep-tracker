import{ AfterViewInit, Component, ElementRef }from'@angular/core';
import{ Chart }from'chart.js/auto';
import{ getChartDataset, getChartOptions }from'../../types/constants';
import{ BoardService }from'../../service/board.service';
import{ map }from'rxjs/operators';

@Component( {
  selector: 'charts', 
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss'
} )
export class ChartsComponent implements AfterViewInit{
  constructor( 
    private boardService: BoardService,
    private elementRef: ElementRef ){
  }
  ngAfterViewInit(): void{
    const style = getComputedStyle( document.body );
    const col1 = style.getPropertyValue( '--tag-orange-color' );
    const col2 = style.getPropertyValue( '--tag-green-color' );
    const col3 = style.getPropertyValue( '--tag-yellow-color' );

    const border = style.getPropertyValue( '--translucent-color' );
    const fs = style.getPropertyValue( '--font-size' );
    const ff = style.getPropertyValue( '--font-family' );
    const tc = style.getPropertyValue( '--text-color' );

    this.boardService.allTasks$.pipe(
      map( t => { 
        const ret: {[title:string]: number} = {}
        t?.forEach( task => {
          ret[task.status] = ( ret[task.status] ?? 1 ) + 1
        } )
        return ret } )
    ).subscribe( r => {
      new Chart(
        'archive',
        {
          type: 'pie',
          options: getChartOptions( border,tc, ff,fs ),
          
          data: {
            labels: Object.keys( r ),
            datasets: [ 
              getChartDataset( 'My First Dataset', Object.values( r ), col1, col2, col3 )
            ]
          }
        }
      );
    } )
    
  }

}
