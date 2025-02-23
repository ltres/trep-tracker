import{ Injectable }from'@angular/core';
import{ BoardService }from'./board.service';
import{ Task }from'../types/types';
import{ tagTypes }from'../types/constants';
import{ calculateWorkingHours }from'../utils/date-utils';
import{ isTimedTask }from'../utils/guards';

export type Allocation = {startDate: Date, endDate: Date, allocationPercentage: number};
export type Allocations = {resource: string, allocations: Allocation[]  }[]

@Injectable( {
  providedIn: 'root'
} )
export class PlanService{
  constructor( 
    private boardService : BoardService,
  ){ }

  /**
   * Returns an array of allocations for the resources (mentions) included in the provided tasks, for the given granularity
   * @param startDate 
   * @param endDate 
   * @param tasks 
   */
  calculateAllocations( startDate: Date, endDate: Date, tasks: Task[] ):  Allocations{
    // isolate the resources:
    const ret: Allocations = []
    const mentions = [...new Set( tasks.flatMap( t => t.tags ).filter( ( t ) => t.type === tagTypes.tagOrange ).map( t => t.tag ) )];

    for( const mention of mentions ){
      const toPush:{ resource: string, allocations: Allocation[] } = { resource: mention, allocations: [] };
      const workingHours = calculateWorkingHours( startDate, endDate );
      const resourceTasks = tasks.filter( t => t.tags.find( ta => ta.tag === mention ) ).filter( t => t && isTimedTask( t ) ).map( t => {
        const calcDates = this.boardService.getComputedDatesAccountingForWorkingDays( t );
        return{
          startDate: calcDates.startDate,
          endDate: calcDates.endDate,
          resourcesAllocation: t.time.resourcesAllocation
        }

      } )
      // for each hour, calculate the resource allocation:
      for( const hour of workingHours.detail ){
        // Resource allocation is the sum of the percentages of allocations in any task they are involved
        const isWoringInHours = resourceTasks.filter( ta => ta.startDate.getTime() <= hour.startDate.getTime() && ta.endDate.getTime() >= hour.endDate.getTime()  )
        if( isWoringInHours.length > 0 ){
          toPush.allocations.push( {startDate: hour.startDate, endDate: hour.endDate, allocationPercentage: isWoringInHours.reduce( ( acc, wh ) => acc + ( wh.resourcesAllocation ?? 100 ), 0 )} )
        }
      }

      // console.log( `${granularity} ${workingDays}` );
      ret.push( toPush )
    }
    return ret;
    
  }

}
