import { Input } from "@angular/core";


export interface Board{
    id: string,
    lanes: Lane[]
}
export interface Lane{
    id: string,
    tasks: Task[]
}
export interface Task{
    id: string,
    textContent: string;
}