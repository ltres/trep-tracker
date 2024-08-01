import { Type } from '@angular/core';
import { generateUUID } from '../utils/utils';
 
import { StorageServiceAbstract } from './storage';

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
    gantt?: {
        startDate: ISODateString,
        endDate: ISODateString,
        progress: number,
        order?: number,
        duration?: number,
        successors: {
            taskId: string
            linkId: string
        }[]
    }
}

export interface Container {
    id: string;
    _type: string,
    textContent: string;
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

export const Layouts = {
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
};

export type Layout = keyof typeof Layouts;

export type LayoutProperties = {
    [K in Layout]: {
        column: number;
        order: number;
        width: number;
    }
};

export interface Tag {
    tag: string;
    type: string
}
export type Priority = 0 | 1 | 2 | 3 | 4;
export const Priorities: Priority[] = [0, 1, 2, 3, 4];

export const Statuses = {
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
};

export type Status = keyof typeof Statuses;

export type StateChangeDate = {
    [keyStatus in Status]?: {
        enter?: ISODateString,
        leave?: ISODateString
    };
};

export type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`
export type DayDateString = `${number}-${number}-${number}`

export const addTagsForDoneAndArchived = false;

export const tagIdentifiers: { type: string, symbol: string, class: string }[] = [
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
  /*
    {
        type: "tag-plus",
        symbol: '\\+',
        class: "tag-plus"
    },
    */
  {
    type: 'tag-green',
    symbol: '!',
    class: 'tag-green',
  },
];
export const tagHtmlWrapper = (kl: string) => (['<span tag="true" class="' + kl + '">', '</span>']);
export const tagCapturingGroup = (symbol: string) => (`${symbol}([A-Za-z0-9-_]+)`);

export const getNewTask: (lane: Lane, textContent?: string | undefined) => Task = (lane: Lane, textContent?: string | undefined) => {
  const uuid = generateUUID();
  return {
    id: uuid,
    createdLaneId: lane.id,
    textContent: typeof textContent != 'undefined' ? textContent : `Task ${uuid}`,
    children: [],
    tags: [],
    includeInGantt: false,
    dates: {

    },
    _type: 'task',
    creationDate: new Date().toISOString() as ISODateString,
    stateChangeDate: undefined,
    archived: false,
    archivedDate: undefined,
    priority: 1,
    status: 'todo',
  };
};

export const archivedLaneId = 'Archive';

export const getNewLane: (archive: boolean) => Lane = (archive: boolean) => {
  const id = generateUUID();
  return {
    id: id,
    tags: [],
    index: 0,
    showChildren: true,
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
