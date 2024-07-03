import { generateUUID } from "../utils/utils";

export interface Board extends Container<Lane>{

}
export interface Lane extends Container<Task>{
    _type: 'lane',
    showChildren: boolean,
    archive: boolean,
    width: number | undefined
}
export interface Task extends Container<Task>{
    _type: 'task',
    status: TaskStatus
}

export const TaskStatuses = {
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
    }
}

export type TaskStatus = keyof typeof TaskStatuses;


export interface Container<T extends Container<any> = any> {
    id: string;
    textContent: string;
    children: T[];
    tags: Tag[];
    _type: string,
    creationDate: Date,
    priority: Priority,
    stateChangeDate: Date | undefined,
    archived: boolean,
    archivedDate: Date | undefined,
    coordinates?: {
        x: number,
        y: number
    },
}

export type Priority = undefined | 1 | 2 | 3 | 4

export interface Tag{
    tag: string;
    type: string
}

export const addTagsForDoneAndArchived = false



export const tagIdentifiers:{ type: string, symbol: string, class:string}[] = [
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


export const getNewTask: ( textContent?: string | undefined ) => Task = (textContent?: string | undefined) => (
     {
        id: generateUUID(),
        textContent: textContent ?? "",
        children: [],
        tags: [],
        _type: "task",
        creationDate: new Date(),
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
        _type: "lane",
        archive: archive,
        creationDate: new Date(),
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
            priority: undefined,
            children: [firstLane],
            creationDate: new Date(),
            stateChangeDate: undefined,
            archived: false,
            archivedDate: undefined       
    }
)