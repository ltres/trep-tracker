import { Input } from "@angular/core";


export interface Board{
    id: string,
    lanes: Lane[]
}
export interface Lane{
    id: string,
    main?: boolean,
    tasks: Task[]
    position: 'relative' | 'absolute'
    coordinates?: {
        x: number,
        y: number
    }
}
export interface Task{
    id: string,
    textContent: string;
    active: boolean;
}

export interface DragEventCoordinates{
    cursorX: number,
    cursorY: number,
    deltaX: number,
    deltaY: number
}