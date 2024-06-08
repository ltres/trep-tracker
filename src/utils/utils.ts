import { v4 as uuidv4 } from 'uuid';
import { DragEventCoordinates } from '../types/task';

export function generateUUID(): string {
    return uuidv4().substring(0,6);
}


export function isInside(dragCoordinates: DragEventCoordinates, DOMRect: DOMRect): "top-half" | "bottom-half" | false {
    if (DOMRect.x < dragCoordinates.cursorX && dragCoordinates.cursorX < DOMRect.x + DOMRect.width &&
        DOMRect.y < dragCoordinates.cursorY && dragCoordinates.cursorY < DOMRect.y + DOMRect.height
    ) {
        return dragCoordinates.cursorY - DOMRect.y < DOMRect.height / 2 ? "top-half" : 'bottom-half';
    }
    return false;
}

export function overlaps(DOMRect: DOMRect | undefined, DOMRect2: DOMRect | undefined): boolean {
    if(!DOMRect || !DOMRect2)return false;
    return DOMRect.x < DOMRect2.x + DOMRect2.width && DOMRect.x + DOMRect.width > DOMRect2.x 
    && DOMRect.y < DOMRect2.y + DOMRect2.height && DOMRect.y + DOMRect.height > DOMRect2.y;
}

export function cursorIsInside(event: DragEvent, DOMRect: DOMRect | undefined): boolean {
    if (!DOMRect) return false;
    return DOMRect.x < event.clientX && event.clientX < DOMRect.x + DOMRect.width &&
        DOMRect.y < event.clientY && event.clientY < DOMRect.y + DOMRect.height;
}