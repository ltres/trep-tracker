import { Container, Status, ISODateString } from "../types/types";

export const locale = {
  short:"it",
  long: "it-IT"
}

export const startOfDay = 9;
export const endOfDay = 18

// learn more about this from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
export const datePickerFormat = {
  fullPickerInput: {year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false},
  datePickerInput: {year: 'numeric', month: 'numeric', day: 'numeric', hour12: false},
  timePickerInput: {hour: 'numeric', minute: 'numeric', hour12: false},
  monthYearLabel: {year: 'numeric', month: 'short', hour12: false},
  dateA11yLabel: {year: 'numeric', month: 'long', day: 'numeric', hour12: false},
  monthYearA11yLabel: {year: 'numeric', month: 'long', hour12: false},
};

export function setDateSafe(container: Container, status: Status, enterOrLeave: 'enter' | 'leave', date: Date) {
  if (!container.dates[status]) {
    container.dates[status] = {};
  }
      container.dates[status]![enterOrLeave] = date.toISOString() as ISODateString;
}
  
export function getIsoString(date: Date): ISODateString {
  return date.toISOString() as ISODateString;
}

export function fromIsoString(date: ISODateString): Date {
  return new Date(date);
}
  
export function getDiffInDays(date: Date, date2: Date){
  return (date2.getTime() - date.getTime()) / ( 1000 * 3600 * 24 )
}
  
export function getWorkingDays(startDate: ISODateString, endDate: ISODateString) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  const currentDate = new Date(start);
  
  while (currentDate < end) {
    // Check if the current day is a weekday (Monday-Friday)
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return Math.abs(workingDays);
}
  
export function formatDate(date: ISODateString | undefined, locale: string) {
  if(!date){
    console.warn("format date called on empty object");
    return ""
  }
  return new Date(date).toLocaleDateString(locale);
}