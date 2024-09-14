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

export function ganttDateToDate( ganttDate: string ): Date{
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