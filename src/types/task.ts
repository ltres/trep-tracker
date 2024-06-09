export interface Board extends Container<Lane>{

}
export interface Lane extends Container<Task>{
    _type: 'lane',
    showChildren: boolean
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
    coordinates?: {
        x: number,
        y: number
    }
}

export interface Tag{
    tag: string;
}
