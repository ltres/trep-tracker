import { generateUUID } from "../utils/utils";

export interface Board extends Container<Lane>{

}
export interface Lane extends Container<Task>{
    _type: 'lane',
    showChildren: boolean,
    isArchive: boolean,
    width: number | undefined
}
export interface Task extends Container<Task>{
    _type: 'task',
    createdLaneId: string,
}

export interface Container<T extends Container<any> = any> {
    id: string;
    _type: string,
    textContent: string;
    children: T[];
    tags: Tag[];
    creationDate: ISODateString,
    priority: Priority | undefined,
    status: Status | undefined,
    dates: StateChangeDate
    coordinates?: {
        x: number,
        y: number
    },
}


export interface Tag{
    tag: string;
    type: string
}

export type Priority = 1 | 2 | 3 | 4

export const Statuses = {
    todo : {
        icon: "☐"
    },
    "in-progress": {
        icon: "🛠️",
    },
    delegated: {
        icon: "👦🏼",
    },
    waiting: {
        icon: "⏳",
    },
    completed: {
        icon: "✅",
    },
    archived: {
        icon: "📂",
    }
}

export type Status = keyof typeof Statuses;

export type StateChangeDate = {
    [keyStatus in Status]?: {
        enter?: ISODateString,
        leave?: ISODateString
    };
};

export type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`

export const addTagsForDoneAndArchived = false

export const tagIdentifiers: { type: string, symbol: string, class:string }[] = [
    {
        type: "tag-orange",
        symbol: '@',
        class: "tag-orange"
    },
    {
        type: "tag-yellow",
        symbol: '#', 
        class: "tag-yellow"
    },
    {
        type: "tag-green",
        symbol: '!', 
        class: "tag-green"
    }
]
export const tagHtmlWrapper = (kl:string) => ( ['<span tag="true" class="' + kl + '">','<\/span>'] )
export const tagCapturingGroup = (symbol:string) => ( `${symbol}([A-Za-z0-9\-\_]+)` );


export const getNewTask: ( lane: Lane, textContent?: string | undefined ) => Task = ( lane: Lane, textContent?: string | undefined) => (
     {
        id: generateUUID(),
        createdLaneId: lane.id,
        textContent: textContent ?? "",
        children: [],
        tags: [],
        dates: {

        },
        _type: "task",
        creationDate: new Date().toISOString() as ISODateString ,
        stateChangeDate: undefined,
        archived: false,
        archivedDate: undefined,
        priority: 1,
        status: "todo"
    }
)

export const archivedLaneId = "Archive";

export const getNewLane: ( archive: boolean ) => Lane = (archive: boolean) => {
    let id = generateUUID();
    return {
        id:  id,
        tags: [],
        showChildren: true,
        textContent: archive ? "Archive" : "Lane " + id,
        children: [],
        status: undefined,
        _type: "lane",
        dates: {},
        isArchive: archive,
        creationDate: new Date().toISOString() as ISODateString,
        stateChangeDate: undefined,
        priority: undefined,
        width: undefined,
        archived: false,
        archivedDate: undefined
    }
}


export const getNewBoard: (firstLane: Lane) => Board = (firstLane: Lane) => (
    {      
            id: generateUUID(),
            _type: "board",
            textContent: "Board",
            tags: [],
            status: undefined,
            priority: undefined,
            dates: {},
            children: [firstLane],
            creationDate: new Date().toISOString() as ISODateString,
            stateChangeDate: undefined,
            archived: false,
            archivedDate: undefined       
    }
)