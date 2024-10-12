import{ Injectable }from'@angular/core';
import{ Board, ChartType, Lane, Task }from'../types/types';
import{ BoardService }from'./board.service';
import{ getChartDataset, getChartOptions }from'../types/constants';
import{ isPlaceholder, isArchivedOrDiscarded }from'../utils/utils';
import{ ColorsService }from'./colors.service';
import{ formatDate, getDiffInDays, toIsoString }from'../utils/date-utils';
import Chart, { ChartItem }from'chart.js/auto';
import{ getChartLabelPlugin, PLUGIN_ID  }from'chart.js-plugin-labels-dv';

@Injectable( {
  providedIn: 'root'
} )
export class ChartService{

  constructor( 
    private boardService : BoardService,
    private colorService : ColorsService
  ){ }

  private hasRegisteredPlugin(): boolean{
    return!!Chart.registry?.plugins.get( PLUGIN_ID );
  }

  generateChart( element: ChartItem, chartType: ChartType, board: Board, lane: Lane | undefined, tasks: Task[] | undefined, showTitle: boolean, showLegend: boolean, useAnimation: boolean, padding: number | undefined ): Chart{
    Chart.register( getChartLabelPlugin() );
    const style = getComputedStyle( document.body );
    const border = style.getPropertyValue( '--dark-gray-2-muted' ); 
    const fs = style.getPropertyValue( '--chart-labels-font-size' );
    const ff = style.getPropertyValue( '--font-family' );
    const tc = style.getPropertyValue( '--text-color' );
    const laneBackgroundColor = style.getPropertyValue( '--lane-non-static-background-color' );

    switch( chartType ){
      case'tasksByStatus':{
    
        tasks = tasks?.filter( task => !isPlaceholder( task ) && !isArchivedOrDiscarded( task ) );
        let ret: {setLabel: string, setValue: number, setColor: string}[] = []
        tasks?.forEach( task => {
          const ex = ret.find( e => e.setLabel === task.status );
          if( ex ){
            ex.setValue++
          }else{
            ret.push( {setLabel: task.status, setValue: 1, setColor: this.colorService.findColor( task.status )} );
          }
        } )
        ret = ret.sort( ( k1, k2 ) => k2.setValue - k1.setValue );

        return new Chart(
          element,
          {
            type: "doughnut",
            options: getChartOptions( "Tasks by status", border, tc, ff, fs, "doughnut", showTitle, showLegend, useAnimation, padding ),
            
            data: {
              labels: ret.map( r => r.setLabel ),
              datasets: [getChartDataset( "Tasks by status", ret.map( e => e.setValue ), ret.map( e => e.setColor ), laneBackgroundColor, "doughnut" )]
            }
          }
        );
      }
      case'tasksByPriority':
      {
    
        tasks = tasks?.filter( task => !isPlaceholder( task ) && !isArchivedOrDiscarded( task ) );
        let ret: {key:string, setLabel: string, setValue: number, setColor: string}[] = []
        tasks?.forEach( task => {
          const ex = ret.find( e => e.key === `priority-${task.priority}` );
          if( ex ){
            ex.setValue++
          }else{
            ret.push( {key: `priority-${task.priority}`, setLabel: `priority ${task.priority}`, setValue: 1, setColor: this.colorService.findColor( `priority-${task.priority}` )} );
          }
        } )
        ret = ret.sort( ( k1, k2 ) => k2.setValue - k1.setValue );
  
        return new Chart(
          element,
          {
            type: "doughnut",
            options: getChartOptions( "Tasks by priority", border, tc, ff, fs, "doughnut", showTitle, showLegend, useAnimation, padding ),
              
            data: {
              labels: ret.map( r => r.setLabel ),
              datasets: [getChartDataset( "Tasks by priority", ret.map( e => e.setValue ), ret.map( e => e.setColor ), laneBackgroundColor, "doughnut" )]
            }
          }
        );
      }
      case'tasksByTag':
      {   
        tasks = tasks?.filter( task => !isPlaceholder( task ) && !isArchivedOrDiscarded( task ) );
        let ret: {setLabel: string, setValue: number, setColor: string}[] = []
        tasks?.forEach( task => {
          task.tags.forEach( tag => {
            const ex = ret.find( e => e.setLabel === tag.tag );
            if( ex ){
              ex.setValue++
            }else{
              ret.push( {setLabel: tag.tag, setValue: 1, setColor: this.colorService.findColor( tag.type )} );
            }
          } )
        } )
        ret = ret.sort( ( k1, k2 ) => k2.setValue - k1.setValue ).splice( 0, 6 );
  
        return new Chart(
          element,
          {
            type: "doughnut",
            options: getChartOptions( "Tasks by tag", border, tc, ff, fs, "doughnut", showTitle, showLegend, useAnimation, padding  ),
              
            data: {
              labels: ret.map( r => r.setLabel ),
              datasets: [getChartDataset( "Tasks by tag", ret.map( e => e.setValue ), ret.map( e => e.setColor ), laneBackgroundColor, "doughnut" )]
            }
          }
        );
      }

      case"createdVsCompleted":
      {   
        const color1 = this.colorService.findColor( "pink-pastel" );
        const color2 = this.colorService.findColor( "completed" )
        tasks = tasks?.filter( task => !isPlaceholder( task ) );
        const days =7;
        const ret: {setLabel: string, setValue: number, setColor: string}[] = []
        const ret2: {setLabel: string, setValue: number, setColor: string}[] = []
        const ret3: {setLabel: string, setValue: number, setColor: string}[] = []
        const ret4: {setLabel: string, setValue: number, setColor: string}[] = []
        const today = new Date();

        //const lastMonday = getLastMonday();
        //const daysToDisplay = 7 - lastMonday.getDay() + 1
        let last = 0;
        for( let k = 0; k <= days; k++ ){
          const ref = new Date();

          ref.setDate( today.getDate() - days + k  )
          // find tasks created that day:
          const dayTasks = tasks?.filter( task => Math.round( getDiffInDays( task.creationDate, toIsoString( ref ) ) ) === 0 ).length ?? 0 // TODO fix vogliamo dalle 00 alle 23.59
          last = last + dayTasks
          ret.push( {setLabel: formatDate( toIsoString( ref ), board.datesConfig ), setValue: last, setColor: color1 } );
          ret3.push( {setLabel: formatDate( toIsoString( ref ), board.datesConfig ), setValue: dayTasks, setColor: color1 } );

        }
        last = 0;
        for( let k = 0; k <= days; k++ ){
          const ref = new Date();

          ref.setDate( today.getDate() - days + k  )
          // find tasks created that day:
          const dayTasks = tasks?.filter( task => task.dates.completed?.enter && Math.round( getDiffInDays( task.dates.completed.enter, toIsoString( ref ) ) ) === 0 ).length ?? 0
          last = last + dayTasks
          ret2.push( {setLabel: formatDate( toIsoString( ref ), board.datesConfig ), setValue: last, setColor: color2 } );
          ret4.push( {setLabel: formatDate( toIsoString( ref ), board.datesConfig ), setValue: dayTasks, setColor: color2 } );

        }
  
        return new Chart(
          element,
          {
            type: "line",
            options: getChartOptions( "Tasks by tag", border, tc, ff, fs, "line", showTitle, showLegend, useAnimation, padding ),
              
            data: {
              labels: ret.map( r => r.setLabel ),
              datasets: [
                getChartDataset( "Created", ret.map( e => e.setValue ), [color1], undefined, "line" ),
                getChartDataset( "Completed", ret2.map( e => e.setValue ), [color2],  undefined, "line" ),
                getChartDataset( "Created", ret3.map( e => e.setValue ), [color1],  undefined, "bar" ),
                getChartDataset( "Completed", ret4.map( e => e.setValue ), [color2],  undefined, "bar" )
              ]
            }
          }
        );
      }
    }
  }

}
