import { datePickerFormat, locale } from "../types/constants";
import { Container, Status, ISODateString } from "../types/types";

export function setDateSafe(container: Container, status: Status, enterOrLeave: 'enter' | 'leave', date: Date) {
  if (!container.dates[status]) {
    container.dates[status] = {};
  }
      container.dates[status]![enterOrLeave] = date.toISOString() as ISODateString;
}
  
export function toIsoString(date: Date): ISODateString {
  return date.toISOString() as ISODateString;
}

export function fromIsoString(date: ISODateString): Date {
  return new Date(date);
}
  
export function getDiffInDays(date: ISODateString, date2: ISODateString){
  return Math.round((new Date(date2).getTime() - new Date(date).getTime()) / ( 1000 * 3600 * 24 ) * 10) / 10
}
  
export function getWorkingDays(startDate: ISODateString, endDate: ISODateString) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  const currentDate = new Date(start);
  
  while (currentDate < end) {
    // Check if the current day is a weekday (Monday-Friday)
    if (currentDate.getUTCDay() !== 0 && currentDate.getUTCDay() !== 6) {
      workingDays++;
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  return Math.abs(workingDays);
}

export function toUTCDate( date: string ): ISODateString{
  // Parse the local date string
  const [datePart, timePart] = date.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a Date object (in local time)
  const localDate = new Date(year, month - 1, day, hours, minutes);
  
  // Format the UTC date as a string (ISO format)
  return localDate.toISOString() as ISODateString;
}

export function formatDate(date: ISODateString | Date | undefined) {
  if(!date){
    console.warn("format date called on empty object");
    return ""
  }
  const dateTimeFormat = new Intl.DateTimeFormat(locale.long, datePickerFormat.baseDateFormat);
  const parts = dateTimeFormat.formatToParts(typeof date === 'string' ? new Date(date) : date);
  let out = locale.dateFormat
  for(const part of ["day","month","year","timeZoneName"]){
    out = out.replace(part, parts.find( p => p.type === part )?.value ?? "" )
  }
  return out
}

export function addToDate( date: Date | ISODateString, years: number, months: number, days: number ){
  const toWork = typeof date === 'string' ? new Date(date) : date;
  const toReturn = new Date( Date.UTC(toWork.getUTCFullYear() + years, toWork.getUTCMonth() + months, toWork.getUTCDate() + days) );
  return toReturn
}

export function addUnitsToDate( date: Date | ISODateString, amount: number, unit: 'day'| 'week' | 'month' | 'year' ){
  const toWork = typeof date === 'string' ? new Date(date) : date;
  const toReturn = new Date( Date.UTC(toWork.getUTCFullYear() + ( unit === 'year' ? amount : 0 ), toWork.getUTCMonth() + ( unit === 'month' ? amount : 0 ), toWork.getUTCDate() + ( unit === 'day' ? amount : ( unit === 'week' ? amount * 7 : 0 ) ), toWork.getUTCHours(), toWork.getUTCMinutes(), toWork.getUTCSeconds(), toWork.getUTCMilliseconds() ));
  return toReturn
}
