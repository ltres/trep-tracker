import{ AfterViewInit, Component, ElementRef }from'@angular/core';
import{ Chart }from'chart.js/auto';

@Component( {
  selector: 'charts', 
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss'
} )
export class ChartsComponent implements AfterViewInit{
  constructor( private elementRef: ElementRef ){
  }
  ngAfterViewInit(): void{
    ( this.elementRef.nativeElement as HTMLElement ).querySelectorAll( `canvas` ).forEach( c => {
      new Chart(
        c,
        {
          type: 'pie',
          options:{
            responsive:true,
            maintainAspectRatio: false,
            plugins:{
              legend:{
                position:'right'
              }
            }
          },
          
          data: {
            labels: [
              'Red',
              'Blue',
              'Yellow'
            ],
            datasets: [{
              label: 'My First Dataset',
              data: [300, 50, 100],
              backgroundColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 205, 86)'
              ],
              hoverOffset: 4
            }]
          }
        }
      );
    } )

  }

}
