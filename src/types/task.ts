import { generateUUID } from "../utils/utils";

export interface Board extends Container<Lane>{

}
export interface Lane extends Container<Task>{
    _type: 'lane',
    showChildren: boolean,
    width: number | undefined
}
export interface Task extends Container<Task>{
    
    _type: 'task',
    status: "completed" | "todo"
}

export interface Container<T extends Container<any> = any> {
    id: string;
    textContent: string;
    children: T[];
    tags: Tag[];
    _type: string,
    creationDate: Date,
    stateChangeDate: Date | undefined,
    archived: boolean,
    archivedDate: Date | undefined,
    priority: number,
    coordinates?: {
        x: number,
        y: number
    },
    
}

export interface Tag{
    tag: string;
}

export const DoneTag : Tag = {tag: '@Done'}
export const ArchivedTag : Tag = {tag: '@Archived'}

export const tagIdentifiers:{symbol: string, class:string}[] = [
    {
        symbol: '@',
        class: "tag-orange"
    },
    {
        symbol: '#',
        class: "tag-yellow"
    }
]
export const tagHtmlWrapper = (kl:string) => ( ['<span tag="true" class="' + kl + '">','</span>'] )
const spaces = "\s\t\n\u00A0\u2002\u2003\u2006\u202F "
export const tagCapturingGroup = (symbol:string) => ( `${symbol}([A-Za-z0-9\-\_]+)` );


export const getNewTask: () => Task = () => (
     {
        id: generateUUID(),
        textContent: "",
        children: [],
        tags: [],
        _type: "task",
        creationDate: new Date(),
        stateChangeDate: undefined,
        archived: false,
        archivedDate: undefined,
        priority: 0,
        status: "todo"
    }
)