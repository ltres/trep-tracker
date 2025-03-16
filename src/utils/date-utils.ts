import{ ganttConfig }from"../types/constants";
import{ Container, Status, ISODateString, DateDisplayConfig, Timezone, Recurrence }from"../types/types";

export function setDateSafe( container: Container, status: Status, enterOrLeave: 'enter' | 'leave', date: Date ){
  if( !container.dates[status] ){
    container.dates[status] = {};
  }
      container.dates[status]![enterOrLeave] = date.toISOString() as ISODateString;
}
  
export function toIsoString( date: Date ): ISODateString{
  return date.toISOString() as ISODateString;
}

export function fromIsoString( date: ISODateString ): Date{
  return new Date( date );
}
  
export function getDiffInDays( date: ISODateString, date2: ISODateString ){
  return Math.round( ( new Date( date2 ).getTime() - new Date( date ).getTime() ) / ( 1000 * 3600 * 24 ) * 10 ) / 10
}
  
export function getWorkingDays( startDate: ISODateString, endDate: ISODateString ){
  const start = new Date( startDate );
  const end = new Date( endDate );
  let workingDays = 0;
  const currentDate = new Date( start );
  
  while( currentDate < end ){
    // Check if the current day is a weekday (Monday-Friday)
    if( currentDate.getUTCDay() !== 0 && currentDate.getUTCDay() !== 6 ){
      workingDays++;
    }
    currentDate.setUTCDate( currentDate.getUTCDate() + 1 );
  }
  
  return Math.abs( workingDays );
}

export function ganttDateToDate( ganttDate: string | Date | undefined ): Date{
  if( !ganttDate ){
    return new Date();
  }
  if( typeof ganttDate === 'object' ){
    return ganttDate;
  }
  // Parse the local date string
  const[datePart, timePart] = ganttDate.split( ' ' );
  const[year, month, day] = datePart.split( '-' ).map( Number );
  const[hours, minutes] = timePart.split( ':' ).map( Number );
  
  // Create a Date object (in local time)
  const localDate = new Date( year, month - 1, day, hours, minutes );
  
  return localDate
}

export function formatDate( date: ISODateString | Date | undefined, config: DateDisplayConfig ){
  if( !date ){
    console.warn( "format date called on empty object" );
    return""
  }
  const dateTimeFormat = new Intl.DateTimeFormat( config.locale, config.dateFormat );
  return dateTimeFormat.format( typeof date === 'string' ? new Date( date ) : date );
}

export function addToDate( date: Date | ISODateString, years: number, months: number, days: number ){
  const toWork = typeof date === 'string' ? new Date( date ) : date;
  const toReturn = new Date( Date.UTC( toWork.getUTCFullYear() + years, toWork.getUTCMonth() + months, toWork.getUTCDate() + days ) );
  return toReturn
}

export function addUnitsToDate( date: Date | ISODateString, amount: number, unit: 'hour' | 'day'| 'week' | 'month' | 'year' ){
  const toWork = typeof date === 'string' ? new Date( date ) : date;
  const toReturn = new Date( Date.UTC( toWork.getUTCFullYear() + ( unit === 'year' ? amount : 0 ), toWork.getUTCMonth() + ( unit === 'month' ? amount : 0 ), toWork.getUTCDate() + ( unit === 'day' ? amount : ( unit === 'week' ? amount * 7 : 0 ) ), toWork.getUTCHours() + ( unit === 'hour' ? amount : 0 ), toWork.getUTCMinutes(), toWork.getUTCSeconds(), toWork.getUTCMilliseconds() ) );
  return toReturn
}

export function getTimezoneShortName( timeZone: Timezone ): string{
  const tz1 = Intl.DateTimeFormat( "ia", {
    timeZoneName: "short",
    timeZone,
  } )
  if( !tz1 )return"";
  const format = tz1.formatToParts()
  if( !format )return"";
  return format.find( ( i ) => i.type === "timeZoneName" )?.value ?? "";
  
};

export function getOffset( timeZone: Timezone ): number{
  const tz1 = Intl.DateTimeFormat( "ia", {
    timeZoneName: "shortOffset",
    timeZone,
  } )
  if( !tz1 ){
    throw new Error( "No timezone" )
  };
  const format = tz1.formatToParts()
  if( !format ){
    throw new Error( "No timezone" )
  };
  const shortName = format.find( ( i ) => i.type === "timeZoneName" )?.value ?? "";
  const offset = shortName.slice( 3 );
  if( !offset )return 0;

  const matchData = offset.match( /([+-])(\d+)(?::(\d+))?/ );
  if( !matchData )throw`cannot parse timezone name: ${shortName}`;

  const[, sign, hour, minute] = matchData;
  let result = parseInt( hour );
  if( sign === "-" ) result *= -1;
  if( minute ) result += parseInt( minute );

  return result;

};

/**
 * Moves the input date forward by a recurrence
 * @param date 
 * @param recurrence 
 */
export function shiftByRecurrence( date: Date, recurrence: Recurrence ): Date{
  switch( recurrence ){
    case'daily'.toString():
      date.setUTCDate( date.getUTCDate() + 1 );
      break;
    case'weekly'.toString():
      date.setUTCDate( date.getUTCDate() + 7 );
      break;
    case'monthly'.toString():
      date.setUTCMonth( date.getUTCMonth() + 1 );
      break;
    case'yearly'.toString():
      date.setUTCFullYear( date.getUTCFullYear() + 1 );
      break;
    default:
      throw new Error( 'Invalid recurrence type' );
  }
  return date
}

export function getLastMonday( d?: Date ): Date{
  const today = d ?? new Date();
  const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
  // Calculate how many days to subtract to get to last Monday
  const daysToSubtract = day === 0 ? 6 : day - 1;
    
  // Create new date for last Monday
  const lastMonday = new Date( today );
  lastMonday.setDate( today.getDate() - daysToSubtract );
    
  // Set time to 00:01
  lastMonday.setHours( 0, 1, 0, 0 );
    
  return lastMonday;
}

export function getLastSunday( d?: Date ): Date{
  const today = d ?? new Date();
  const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
  // Calculate how many days to subtract to get to last Monday
    
  // Create new date for last Monday
  const lastSunday = new Date( today );
  lastSunday.setDate( today.getDate() - day );
    
  // Set time to 00:01
  lastSunday.setHours( 0, 1, 0, 0 );
    
  return lastSunday;
}

/**
 * Calculates the start and end dates from a start date and a duration
 * @param startDate 
 * @param durationInWorkingHours 
 * @returns 
 */

export function calculateDatesWithWorkingDays( startDate: Date, durationInWorkingHours: number ) : {
  startDate: Date,
  endDate: Date
}{
  const start = startDate instanceof Date ? startDate : new Date( startDate );

  if( start.getHours() < ganttConfig.startOfWorkingDay ){
    // adjust day start
    start.setHours( ganttConfig.startOfWorkingDay );
  }
  if( start.getHours() >= ganttConfig.endOfWorkingDay ){
    // adjust day start
    start.setHours( ganttConfig.startOfWorkingDay );
    start.setDate( start.getDate() +1 )
  }
  if( start.getHours() == 13 ){
    // adjust day start
    start.setHours( start.getHours()+1 );

  }

  while( !ganttConfig.workDays.includes( start.getDay() ) ){
    // Starting on weekends
    start.setDate( start.getDate() + 1 )
  }

  const end = new Date( start );

  for( let h = 0; h < durationInWorkingHours; h++ ){
    end.setHours( end.getHours() +1 )

    if( h !== durationInWorkingHours -1 && end.getHours() >= ganttConfig.endOfWorkingDay ){
      end.setDate( end.getDate()+1 )
      end.setHours( ganttConfig.startOfWorkingDay );
    }
    const p = ganttConfig.pauseInWorkingDayHours.find( e => e.hour === end.getHours() );
    if( h !== durationInWorkingHours -1 && p && ganttConfig.pauseInWorkingDayHours ){
      end.setHours( end.getHours() + p.pause );
    }

    while( !ganttConfig.workDays.includes( end.getDay() ) ){
      // Ending on weekends
      end.setDate( end.getDate() + 1 )
    }

  }
  // Initialize result object
  const result = {
    startDate: start,
    endDate: end,
  };

  return result;
}

/**
 * Returns the total working hours between the two dates, accounting for start of working day, end, pauses, weekends..
 * @param start 
 * @param end 
 * @returns 
 */
export function calculateWorkingHours( startDate: Date, endDate: Date ): {total:number, detail: {startDate: Date, endDate: Date}[]}{
  const start = new Date( startDate.getTime() );
  const end = new Date( endDate.getTime() );
  if( start.getHours() < ganttConfig.startOfWorkingDay ){
    // adjust day start
    start.setHours( ganttConfig.startOfWorkingDay );
  }
  if( start.getHours() >= ganttConfig.endOfWorkingDay ){
    // adjust day start
    start.setHours( ganttConfig.startOfWorkingDay );
    start.setDate( start.getDate() +1 )
  }

  while( !ganttConfig.workDays.includes( start.getDay() ) ){
    // Starting on weekends
    start.setDate( start.getDate() + 1 )
  }
  start.setMinutes( 0 );
  start.setSeconds( 0 );
  start.setMilliseconds( 0 );

  const ret: {total:number, detail: {startDate: Date, endDate: Date}[]} = {total:0, detail: []}
  const current = new Date( start )
  while( current.getTime() < end.getTime() ){
    const start =  new Date( current );
    current.setHours( current.getHours() + 1 )
    const end =  new Date( current );

    ret.total ++ ;
    ret.detail.push( {startDate: start, endDate:end} );
    if( current.getHours() >= ganttConfig.endOfWorkingDay ){
      current.setDate( current.getDate() + 1 ) 
      current.setHours( ganttConfig.startOfWorkingDay );
    }

    const p = ganttConfig.pauseInWorkingDayHours.find( e => e.hour === current.getHours() );
    if( p && ganttConfig.pauseInWorkingDayHours ){
      current.setHours( current.getHours() + p.pause )
    }
    
    while( !ganttConfig.workDays.includes( current.getDay() ) ){
    // Starting on weekends
      current.setDate( current.getDate() + 1 )
    }
  }
  return ret
}

/**
 * Groups by weeks from startDate - endDate account for the timezone offset (weeks start and end differently)
 * @param startDate 
 * @param endDate 
 */
export function getWeeksBetweenDates( startDate: Date, endDate: Date, timeZoneOffsetHours: number ): {startDate: Date, endDate: Date}[]{
  const offsetMs = timeZoneOffsetHours * 3600 * 1000;
  const intervals: { startDate: Date; endDate: Date }[] = [];
  let currentTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  if( currentTimestamp > endTimestamp ){
    return intervals;
  }

  const msInADay = 1000 * 3600 * 24

  while( currentTimestamp <= endTimestamp ){
    // Adjust current timestamp to the target timezone's local time
    const adjustedTime = currentTimestamp + offsetMs;
    const adjustedDate = new Date( adjustedTime );
    const dayOfWeek = adjustedDate.getUTCDay();

    // Calculate days to subtract to get to the previous Monday (0 represents Sunday)
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeekAdjusted = adjustedTime - daysToSubtract * msInADay;

    // Find the start of the day (midnight) in local time
    const startOfWeekStartOfDay = startOfWeekAdjusted - ( startOfWeekAdjusted % msInADay );

    // Convert back to UTC
    const startUTC = startOfWeekStartOfDay - offsetMs;

    // Calculate end of the week (Sunday 23:59:59.999 in local time)
    const endUTC = startUTC + 7 * msInADay - 1;

    // Ensure the interval does not exceed the endDate
    const intervalEnd = Math.min( endUTC, endTimestamp );

    intervals.push( {
      startDate: new Date( startUTC ),
      endDate: new Date( intervalEnd )
    } );

    // Move to the next week (start just after the current interval ends)
    currentTimestamp = intervalEnd + 1;
  }

  return intervals;
}

export function isSameDate( d1: Date | undefined, d2: Date | undefined ){
  if( !d1 && !d2 ){
    return true
  }else if( d1 && !d2 || d2 && !d1 ){
    return false;
  }else{
    return d1?.getTime() === d2?.getTime()
  }
}