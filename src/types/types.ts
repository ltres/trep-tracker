import{ Type }from'@angular/core';
import{ generateUUID }from'../utils/utils';
 
import{ StorageServiceAbstract }from'./storage';
import{ layoutValues, recurrenceValues, timeframeValues, statusValues, priorityValues, timezoneValues, dateFormats }from'./constants';

export type Environment = {
  storageService: Type<StorageServiceAbstract>,
  userVersion: `${number}.${number}.${number}-${string}`,
  environment: string
}
export interface Board extends Container {
    layout: Layout
    parentId: "app",
    children: Lane[],
    _type: 'board',
    datesConfig: DateDisplayConfig
}

export interface Lane extends Container {
    _type: 'lane',
    children: Task[],
    showChildren: boolean,
    collapsed: boolean,
    isArchive: boolean,
    priority: Priority[] | undefined,
    status: Status[] | undefined,
    endTimeframe: Timeframe | undefined,
    startTimeframe: Timeframe | undefined,
    layouts: LayoutProperties
}

export interface Task extends Container {
    _type: 'task',
    children: Task[],
    recurrences?: RecurringTaskChild[],
    
    priority: Priority,
    status: Status,
    notes?: string,
    startDate?: ISODateString,
    gantt?: GanttData
}

export type GanttData = {
  showData?: boolean, // activates when 'cancel' button is clicked and prevents dates data to be displayed
  startDate: ISODateString,
  endDate: ISODateString,
  progress: number,
  order?: {
    board?: number,
    [laneId: string]: number | undefined
  },
  recurrence?: Recurrence,
  displayRecurrence?: boolean,
  recurringChildIndex?: number,
  fatherRecurringTaskId?: string,
  successors: {
      taskId: string
      linkId: string
  }[]
}

export interface GanttTask extends Task{
    gantt: GanttData
}

export interface RecurringTask extends GanttTask{
  recurrences: RecurringTaskChild[],
  gantt: GanttData & { 
    recurrence: Recurrence,
    displayRecurrence: boolean
  }
}

export interface RecurringTaskChild extends GanttTask{
  gantt: GanttData & { 
    recurringChildIndex: number,
    fatherRecurringTaskId: string
  }
}

export interface Container {
    id: string;
    _type: string,
    parentId: string,
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

export const getNewTask: ( lane: Lane | string, id: string | undefined, textContent: string | undefined ) => Task = ( lane: Lane | string, id: string | undefined, textContent?: string | undefined ) => {
  const taskId = id ?? generateUUID()
  const t: Task = {
    id: taskId,
    parentId: typeof lane === 'string' ? lane : lane.id,
    textContent: typeof textContent != 'undefined' ? textContent : `Task ${taskId.substring( 0,4 )}`,
    children: [],
    tags: [],
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

/*
function proxyContainer<T extends Container>( obj: T ): T{
  return new Proxy( obj, {
    set( target: T, prop: string | symbol, value: unknown, receiver: unknown ){
      if( prop === 'children' ){
        assertIsContainers( value );
        value.forEach( c => c.parentId = target.id ) // Each time a children array is set, updates references to the parent
        return Reflect.set( target, prop, value ? proxyContainers( value, target.id ) : value, receiver );
      }
      return Reflect.set( target, prop, value, receiver );
    }
  } );
}

function proxyContainers( arr: Container[], parentId: string ): Container[]{
  return new Proxy( arr, {
    set( target: Container[], prop: string | symbol, value: Container, receiver: unknown ){
      if( typeof prop === 'string' ){
        const numProp = Number( prop );
        if( !isNaN( numProp ) ){
          value.parentId = parentId // Each time a new element is added to a children array, update references to the new parent
          return Reflect.set( target, prop, value, receiver );
        }
      }
      return Reflect.set( target, prop, value, receiver );
    }
  } );
}
*/
export const getNewLane: ( board: Board, archive: boolean ) => Lane = ( board: Board, archive: boolean ) => {
  const id = generateUUID();
  return{
    id: id,
    parentId: board.id,
    tags: [],
    index: 0,
    showChildren: true,
    collapsed: archive ? true : false,
    textContent: archive ? 'Archive' : 'Lane ' + id.substring( 0,4 ),
    children: [],
    status: undefined,
    startTimeframe: undefined,
    endTimeframe: undefined,
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

export function getLayouts( width?: number | undefined ): LayoutProperties{
  return{
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

export const getNewBoard: ( firstLane?: Lane ) => Board = ( firstLane?: Lane ) => (
  {
    id: generateUUID(),
    parentId: "app",
    layout: 'absolute',
    flexColumns: undefined,
    _type: 'board',
    textContent: 'Board',
    tags: [],
    status: undefined,
    priority: undefined,
    dates: {},
    children: firstLane ? [firstLane] : [],
    creationDate: new Date().toISOString() as ISODateString,
    stateChangeDate: undefined,
    archived: false,
    archivedDate: undefined,
    datesConfig: {
      locale: getDefaultLocale(),
      showTimezoneInfo: false,
      dateFormat: { ...dateFormats['boardDateFormat'], timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, timeZoneName: "short"}
    }
  }
);

export function getDefaultLocale(){
  if( navigator.languages != undefined ) 
    return navigator.languages[0]; 
  return navigator.language;
}

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
} | { 
  timeframe: [Timeframe | undefined, Timeframe | undefined] 
}

export type DateDisplayConfig ={
  locale: Locale,
  dateFormat: Intl.DateTimeFormatOptions
}

export type Timezone = typeof timezoneValues[number];
export type Locale = string;
export type DateFormat = keyof typeof dateFormats;

export type AddFloatingLaneParams ={
  board: Board, 
  x: number, 
  y: number, 
  children: Task[], 
  archive: boolean, 
  width?: number,
  position?:{
    layout: Layout,
    column: number,
    order: number;
  },
  skipBoardsUpdate?: boolean
}