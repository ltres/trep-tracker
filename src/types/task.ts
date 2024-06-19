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