import{ AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild }from'@angular/core';
import{ Chart }from'chart.js/auto';
import{ BoardService }from'../../service/board.service';
import{ ColorsService }from'../../service/colors.service';
import{ Board, ChartType, Lane, Task }from'../../types/types';
import{ ChartService }from'../../service/chart.service';
import{ Observable, Subscription }from'rxjs';

@Component( {
  selector: 'chart[chartType][board][tasks]', 
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss'
} )
export class ChartComponent implements AfterViewInit, OnDestroy{
  @Input() chartType!: ChartType
  @Input() board!: Board;
  @Input() lane: Lane | undefined;
  @Input() tasks:  Observable<Task[] | undefined> | undefined;
  @Input() showTitle: boolean = false;
  @Input() showLegend: boolean = false;
  @Input() useAnimation: boolean = false;
  @Input() padding: number = 0;

  @ViewChild( 'canvas' ) canvas!: ElementRef;

  first = true;
  subscription: Subscription | undefined;
  chart: Chart | undefined;
  constructor( 
    private boardService: BoardService,
    private colorService: ColorsService,
    private chartService: ChartService,
    private elementRef: ElementRef ){
    
  }

  ngAfterViewInit(): void{
    
    this.subscription = this.tasks?.pipe(
      //debounceTime( 1000 )
    ).subscribe( r => {
      if( this.chart ){
        this.chart.destroy()
      }
      this.chart = this.chartService.generateChart( this.canvas.nativeElement, this.chartType, this.board, this.lane, r, this.showTitle, this.showLegend, this.first ? this.useAnimation : false, this.padding );
      this.first = false;
    } )
  }
  ngOnDestroy(): void{
    this.chart?.destroy()
    this.subscription?.unsubscribe()
  }

}
