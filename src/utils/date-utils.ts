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
  try{
    const tz1 = Intl.DateTimeFormat( "ia", {
      timeZoneName: "short",
      timeZone,
    } )
    if( !tz1 )return"";
    const format = tz1.formatToParts()
    if( !format )return"";
    return format.find( ( i ) => i.type === "timeZoneName" )?.value ?? "";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }catch( e ){
  
    return""
  }
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

export function getLastMonday(): Date{
  const today = new Date();
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

// Function to check if a weekend starts between two dates and adjust if needed
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
    if( h !== durationInWorkingHours -1 && end.getHours() === 13 && ganttConfig.pauseInWorkingDayHours ){
      end.setHours( end.getHours() + ganttConfig.pauseInWorkingDayHours );
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

export function calculateWorkingHoursDuration( start: Date, end: Date ): number{
  let duration = 0;

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

  const current = new Date( start )
  while( current.getTime() < end.getTime() ){
    current.setHours( current.getHours() + 1 )
    duration ++ ;
    if( current.getHours() >= ganttConfig.endOfWorkingDay ){
      current.setDate( current.getDate() + 1 ) 
      current.setHours( ganttConfig.startOfWorkingDay );
    }
    if( current.getHours() === 13 && ganttConfig.pauseInWorkingDayHours ){
      current.setHours( current.getHours() + ganttConfig.pauseInWorkingDayHours )
    }
    
    while( !ganttConfig.workDays.includes( current.getDay() ) ){
    // Starting on weekends
      current.setDate( current.getDate() + 1 )
    }
  }

  return duration;
}