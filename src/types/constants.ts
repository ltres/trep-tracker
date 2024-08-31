import { OwlDateTimeFormats } from "@ltres/angular-datetime-picker";
import { DateDisplayConfig, TagType } from "./types";
import { formatDate } from "../utils/date-utils";

export const ganttConfig = {
  baseTaskDuration : 2,
  shownMonths: 4,
  skipWeekendsInPlanning: true,
  recurrentTaskCssClass:"recurrent-task",
  externalTaskCssClass: "gantt-external-task",
  recurrentTaskHeight: 10,
  recurrenceIterationsShown: 10,
  startOfDay:9,
  endOfDay:18,
  columnsWidth: 500
}

// learn more about this from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
export const dateFormats: {[key:string]: Intl.DateTimeFormatOptions} = {
  boardDateFormat: {
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric', 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: undefined
  },
  //Picker formats below
  fullDateFormat: {
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric', 
    hour12: false, 
    hour: 'numeric', 
    minute: 'numeric', 
    timeZoneName: "short"
  },
  fullPickerInput: {
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: 'numeric', 
    hour12: false, 
    timeZoneName: "short"
  },
  datePickerInput: {
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric', 
    hour12: false, 
    timeZoneName: "short"
  },
  timePickerInput: {
    hour: 'numeric', 
    minute: 'numeric', 
    hour12: false
  },
  monthYearLabel: {
    year: 'numeric', 
    month: 'short', 
    hour12: false
  },
  dateA11yLabel: {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour12: false
  },
  monthYearA11yLabel: {
    year: 'numeric', 
    month: 'long', 
    hour12: false
  },
} as const;

/**
 * Object that is passed to the datePicker in order to display dates
 * @param dateDisplayConfig 
 * @returns 
 */
export const datePickerFormatFuncz: ( dateDisplayConfig: DateDisplayConfig ) => OwlDateTimeFormats = (dateDisplayConfig: DateDisplayConfig) => {
  return {
    parseInput: ( d:Date ) => formatDate( d, {...dateDisplayConfig, dateFormat: dateFormats["boardDateFormat"] } ),
    fullPickerInput: ( d:Date ) => formatDate( d, dateDisplayConfig ),
    datePickerInput: ( d:Date ) => formatDate( d, {...dateDisplayConfig, dateFormat: dateFormats["datePickerInput"] } ),
    timePickerInput: ( d:Date ) => formatDate( d, {...dateDisplayConfig, dateFormat: dateFormats["timePickerInput"] } ),
    monthYearLabel: ( d:Date ) => formatDate( d, {...dateDisplayConfig, dateFormat: dateFormats["monthYearLabel"] } ),
    dateA11yLabel: ( d:Date ) => formatDate( d, {...dateDisplayConfig, dateFormat: dateFormats["dateA11yLabel"] } ),
    monthYearA11yLabel: ( d:Date ) => formatDate( d, {...dateDisplayConfig, dateFormat: dateFormats["monthYearA11yLabel"] } ),
  }
} ;

export const recurrenceValues = [
  "no",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const

export const timeframeValues = [
  "no",
  "6 hours",
  "24 hours",
  "week",
  "month"
] as const

export const layoutValues = {
  absolute: {
    columns: 1,
    symbol: 'Free',
  },
  flex1: {
    columns: 1,
    symbol: '☐',
  },
  flex2: {
    columns: 2,
    symbol: '☐☐',
  },
  flex3: {
    columns: 3,
    symbol: '☐☐☐',
  },
  flex4: {
    columns: 4,
    symbol: '☐☐☐☐',
  },
} as const;

export const priorityValues = [0, 1, 2, 3, 4] as const;

export const statusValues = {
  todo: {
    icon: '☐',
  },
  'in-progress': {
    icon: '🛠️',
  },
  'to-be-delegated': {
    icon: '🙇',
  },
  delegated: {
    icon: '👦🏼',
  },
  waiting: {
    icon: '⏳',
  },
  completed: {
    icon: '✅',
  },
  discarded: {
    icon: '🗑️',
  },
  archived: {
    icon: '📂',
  },
} as const;

export enum tagTypes  {
  tagOrange = 'tag-orange',
  tagYellow = 'tag-yellow',
  tagGreen = 'tag-green',
};

export const tagIdentifiers: { type: TagType, symbol: string, class: string }[] = [
  {
    type: 'tag-orange',
    symbol: '@',
    class: 'tag-orange',
  },
  {
    type: 'tag-yellow',
    symbol: '#',
    class: 'tag-yellow',
  },
  {
    type: 'tag-green',
    symbol: '!',
    class: 'tag-green',
  },
] as const;

export const archivedLaneId = 'Archive' as const;
export const addTagsForDoneAndArchived = false;

export const tagHtmlWrapper = (kl: string) => (['<span tag="true" class="' + kl + '">', '</span>']);
export const tagCapturingGroup = (symbol: string) => (`${symbol}([A-Za-z0-9-_]+)`);

export const expiredTasksStillVisibleHours = 6;
export const millisForMagnitudeStep = 1000 * 3600 * 24; // one day

export const timezoneValues = Intl.supportedValuesOf('timeZone');