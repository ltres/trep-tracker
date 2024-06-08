export interface Board extends Container<Lane>{

}
export interface Lane extends Container<Task>{
    _type: 'lane',
    
}
export interface Task extends Container<Task>{
    textContent: string;
    _type: 'task',
    status: "completed" | "todo"
}

export interface Container<T extends Container<any> = any> {
    id: string;
    children: T[];

    coordinates?: {
        x: number,
        y: number
    }
}



export interface DragEventCoordinates{
    cursorX: number,
    cursorY: number,
    deltaX: number,
    deltaY: number
}