export const GanttConfig = {
  baseTaskDuration : 2,
  shownMonths: 4,
  skipWeekendsInPlanning: true,
  recurrentTaskCssClass:"recurrent-task",
  externalTaskCssClass: "gantt-external-task",
  recurrentTaskHeight: 10,
  recurrenceIterationsShown: 10,
  startOfDay:9,
  endOfDay:18,
  dateFrameForCSSClasses: 1000 * 3600 * 2,
  columnsWidth: 500
}
export const locale = {
  short:"it",
  long: "it-IT",
  timeZone: "Europe/Rome",
  showTimezoneInfo: true,
  dateFormat: "day-month-year timeZoneName"
}

// learn more about this from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
export const datePickerFormat: {
  baseDateFormat: Intl.DateTimeFormatOptions
  [key:string]: Intl.DateTimeFormatOptions
}  = {
  baseDateFormat: {year: 'numeric', month: 'numeric', day: 'numeric', hour12: false, timeZone: locale.timeZone,  ...locale.showTimezoneInfo && {timeZoneName: "short"}},

  fullPickerInput: {year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false, timeZone: locale.timeZone, ...locale.showTimezoneInfo && {timeZoneName: "short"}},
  datePickerInput: {year: 'numeric', month: 'numeric', day: 'numeric', hour12: false, timeZone: locale.timeZone,  ...locale.showTimezoneInfo && {timeZoneName: "short"}},
  timePickerInput: {hour: 'numeric', minute: 'numeric', hour12: false},
  monthYearLabel: {year: 'numeric', month: 'short', hour12: false},
  dateA11yLabel: {year: 'numeric', month: 'long', day: 'numeric', hour12: false},
  monthYearA11yLabel: {year: 'numeric', month: 'long', hour12: false},
};
