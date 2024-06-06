import { Input } from "@angular/core";


export interface Board{
    id: string,
    lanes: Lane[]
}
export interface Lane extends Parent{
    position: 'relative' | 'absolute'
    _type: 'lane',
    coordinates?: {
        x: number,
        y: number
    }
}
export interface Task extends Parent{
    textContent: string;
    status: "completed" | "todo"
}

export interface Parent{
    id: string,
    children: Task[];
}



export interface DragEventCoordinates{
    cursorX: number,
    cursorY: number,
    deltaX: number,
    deltaY: number
}