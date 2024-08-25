import { Type } from '@angular/core';
import { generateUUID } from '../utils/utils';
 
import { StorageServiceAbstract } from './storage';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { layoutValues, recurrenceValues, timeframeValues, statusValues, priorityValues } from './constants';

export type Environment = {
  storageService: Type<StorageServiceAbstract>,
  userVersion: `${number}.${number}.${number}-${string}`,
  environment: string
}
export interface Board extends Container {
    layout: Layout
    children: Lane[],
    _type: 'board',
}

export interface Lane extends Container {
    _type: 'lane',
    children: Task[],
    showChildren: boolean,
    collapsed: boolean,
    isArchive: boolean,
    priority: Priority[] | undefined,
    status: Status[] | undefined,
    layouts: LayoutProperties
}

export interface Task extends Container {
    _type: 'task',
    children: Task[],
    createdLaneId: string,
    priority: Priority,
    status: Status,
    notes?: string,
    startDate?: ISODateString,
    includeInGantt: boolean,
    gantt?: GanttData
}

export type GanttData = {
  showData?: boolean, // activates when 'cancel' button is clicked and prevents dates data to be displayed
  startDate: ISODateString,
  endDate: ISODateString,
  nextRecurrenceStartDate?: ISODateString, // for recurrent tasks
  nextRecurrenceEndDate?: ISODateString, // for recurrent tasks
  progress: number,
  order?: {
    board?: number,
    [laneId: string]: number | undefined
  },
  recurrence?: Recurrence,
  successors: {
      taskId: string
      linkId: string
  }[]
}

export interface GanttTask extends Task{
    gantt: GanttData
}

export interface RecurringGanttTask extends Task{
  gantt: GanttData & { 
    recurrence: Recurrence,
    nextRecurrenceStartDate: ISODateString, // for recurrent tasks
    nextRecurrenceEndDate: ISODateString, // for recurrent tasks
  }
}

export interface Container {
    id: string;
    _type: string,
    textContent: string;
    searchTextContent?: string,
    children: Container[];
    tags: Tag[];
    creationDate: ISODateString,
    priority: Priority | Priority[] | undefined,
    status: Status | Status[] | undefined,
    dates: StateChangeDate
    coordinates?: {
        x: number,
        y: number
    },
}

export type Layout = keyof typeof layoutValues;

export type Recurrence =  typeof recurrenceValues[number];

export type Timeframe =  typeof timeframeValues[number];

export type LayoutProperties = {
    [K in Layout]: {
        column: number;
        order: number;
        width: number;
    }
};

export interface Tag {
    tag: string;
    type: TagType
}
export type Priority = typeof priorityValues[number];

export type Status = keyof typeof statusValues;

export type StateChangeDate = {
    [keyStatus in Status]?: {
        enter?: ISODateString,
        leave?: ISODateString
    };
};

export type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`
export type TagType = 'tag-orange' | 'tag-yellow' | 'tag-green';

export const getNewTask: (lane: Lane | string, id: string | undefined, textContent: string | undefined ) => Task = (lane: Lane | string, id: string | undefined, textContent?: string | undefined) => {
  const taskId = id ?? generateUUID()
  const t: Task = {
    id: taskId,
    createdLaneId: typeof lane === 'string' ? lane : lane.id,
    textContent: typeof textContent != 'undefined' ? textContent : `Task ${taskId}`,
    children: [],
    tags: [],
    includeInGantt: false,
    dates: {

    },
    _type: 'task',
    creationDate: new Date().toISOString() as ISODateString,
    priority: 1,
    status: 'todo',
  };
  // initGanttData(t, new Date());

  return t
};

export const getNewLane: (archive: boolean) => Lane = (archive: boolean) => {
  const id = generateUUID();
  return {
    id: id,
    tags: [],
    index: 0,
    showChildren: true,
    collapsed: archive ? true : false,
    textContent: archive ? 'Archive' : 'Lane ' + id,
    children: [],
    status: undefined,
    _type: 'lane',
    dates: {},
    isArchive: archive,
    creationDate: new Date().toISOString() as ISODateString,
    stateChangeDate: undefined,
    priority: undefined,
    width: undefined,
    archived: false,
    archivedDate: undefined,
    layouts: getLayouts(),
  };
};

export function getLayouts(width?: number | undefined): LayoutProperties {
  return {
    absolute: {
      column: 1,
      order: 1,
      width: width ?? 100,
    },
    flex1: {
      column: 0,
      order: 1,
      width: width ?? 1,
    },
    flex2: {
      column: 0,
      order: 1,
      width: width ?? 1,
    },
    flex3: {
      column:0,
      order: 1,
      width: width ?? 1,
    },
    flex4: {
      column: 0,
      order: 1,
      width: width ?? 1,
    },
  };
}

export const getNewBoard: (firstLane: Lane) => Board = (firstLane: Lane) => (
  {
    id: generateUUID(),
    layout: 'absolute',
    flexColumns: undefined,
    _type: 'board',
    textContent: 'Board',
    tags: [],
    status: undefined,
    priority: undefined,
    dates: {},
    children: [firstLane],
    creationDate: new Date().toISOString() as ISODateString,
    stateChangeDate: undefined,
    archived: false,
    archivedDate: undefined,
  }
);

export type VersionCheckRequest = {
    UUID: string,
    userVersion: string,

    userAgent: string | undefined
    language: string | undefined
    timezoneOffset: number | undefined
    hardwareConcurrency: number | undefined
    platform: string | undefined
    timezone: string | undefined
    date?: ISODateString
    currentVersion?: string,
}

export type VersionCheckResponse = {
    needsUpdate: false,
    currentVersion: string,
    changeLog: string
}

export type PickerOutput = { 
  dates: [Date, Date], 
  recurrence: Recurrence | undefined, 
  
} | { timeframe: Timeframe }