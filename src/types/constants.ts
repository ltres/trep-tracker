import { TagType } from "./types";

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

export const recurrenceValues = [
  "no",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const

export const timeframeValues = [
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
