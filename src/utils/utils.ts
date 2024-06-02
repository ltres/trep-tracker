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