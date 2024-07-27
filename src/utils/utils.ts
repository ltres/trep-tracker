import { v4 as uuidv4 } from 'uuid';
import { Lane, Task, Status, archivedLaneId, ISODateString, Container, DayDateString } from '../types/types';

export function generateUUID(length?: number): string {
    return uuidv4().substring(0, length ?? 6);
}


export function overlaps(DOMRect: DOMRect | undefined, DOMRect2: DOMRect | undefined): boolean {
    if (!DOMRect || !DOMRect2) return false;
    return DOMRect.x < DOMRect2.x + DOMRect2.width && DOMRect.x + DOMRect.width > DOMRect2.x
        && DOMRect.y < DOMRect2.y + DOMRect2.height && DOMRect.y + DOMRect.height > DOMRect2.y;
}

export function cursorIsInside(event: DragEvent, DOMRect: DOMRect | undefined): boolean {
    if (!DOMRect) return false;
    return DOMRect.x < event.clientX && event.clientX < DOMRect.x + DOMRect.width &&
        DOMRect.y < event.clientY && event.clientY < DOMRect.y + DOMRect.height;
}

export function setCaretPosition(editableDiv: HTMLElement, position: number,) {

    // Create a range and a selection object
    const range = document.createRange();
    const selection = window.getSelection();
    if (!selection) {
        console.warn("No selection found");
        return;
    }
    // Function to calculate the text nodes and position within the nodes
    function getTextNodes(node: Node) {
        const textNodes = [] as Node[];
        function recurse(node: Node) {
            if (node.nodeType === 3) {
                textNodes.push(node);
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    recurse(node.childNodes[i]);
                }
            }
        }
        recurse(node);
        return textNodes;
    }

    // Get all text nodes
    const textNodes = getTextNodes(editableDiv);

    // Initialize variables to track the remaining characters to skip
    let charCount = 0;
    let node;
    let offset: number = 0;

    for (let i = 0; i < textNodes.length; i++) {
        if ((charCount + (textNodes[i]?.textContent?.length ?? 0)) >= position) {
            node = textNodes[i];
            offset = position - charCount;
            break;
        }
        charCount += textNodes[i]?.textContent?.length ?? 0;
    }

    // If a node was found, set the range
    if (node) {
        range.setStart(node, offset);
        range.collapse(true);

        // Clear existing selection and add the new range
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

export function getCaretPosition2(): number {
    try {
        return window.getSelection()?.getRangeAt(0).endOffset ?? 0;
    } catch (e) {
        return 0;
    }
}

export function getCaretPosition(element: Node) {
    var caretOffset = 0;
    if (typeof window.getSelection != "undefined") {
        var range: Range | undefined;
        try {
            range = window.getSelection()?.getRangeAt(0);
        } catch (e) {
            return 0;
        }
        if (!range) return 0;
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.endOffset;
    }
    return caretOffset;
}

// @ts-ignore
export function getCaretCharacterOffsetWithin(element: HTMLElement) {
    var caretOffset = 0;
    // @ts-ignore
    var doc = element.ownerDocument || element.document;
    // @ts-ignore
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
        // @ts-ignore
    } else if ((sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        // @ts-ignore
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}



export function isPlaceholder(task: Task) {
    return task.textContent === "";
}

export function isArchive(lane: Lane) {
    return lane.isArchive;
}

export function setStatusPath(value: string) {
    localStorage.setItem('storagePath', value)
}

export function getStatusPath(): string | null {
    return localStorage.getItem('storagePath')
}

export function getNextStatus(t: Task): Status {
    if (t.status === "todo") return "in-progress";
    if (t.status === "in-progress") return "completed";
    if (t.status === "completed") return "archived";
    return 'todo'
}

export function setDateSafe(container: Container, status: Status, enterOrLeave: 'enter' | 'leave', date: Date) {
    if (!container.dates[status]) {
        container.dates[status] = {};
    }
    container.dates[status]![enterOrLeave] = date.toISOString() as ISODateString;
}

export function getIsoString(date: Date): ISODateString{
    return date.toISOString() as ISODateString;
}

export function getDayDate(date: Date): DayDateString{
    const formattedDate = `${date.getDate() >= 10 ? date.getDate() : '0' + date.getDate()}-${date.getMonth() + 1  >= 10 ? date.getMonth() + 1 : "0" + (date.getMonth() + 1) }-${date.getFullYear()}`;
    return formattedDate as DayDateString;
}

export function formatDate(date: ISODateString) {
    return new Date(date).toLocaleDateString();
}

export function removeEntry(
    obj: any,
    keyToRemove?: string,
    condition?: (key: string, value: any) => boolean
): void {
    if (Array.isArray(obj)) {
        for (const item of obj) {
            removeEntry(item, keyToRemove, condition);
        }
    } else if (obj !== null && typeof obj === 'object') {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const shouldRemove = (keyToRemove && key === keyToRemove) ||
                    (condition && condition(key, obj[key]));

                if (shouldRemove) {
                    delete obj[key];
                } else if (Array.isArray(obj[key])) {
                    if( condition && condition(key, obj[key]) ){
                        delete obj[key];
                    }
                    for (const item of obj[key]){
                        if( condition && condition(key, item) ){
                            obj[key] = obj[key].filter((i: any) => i !== item);
                        }
                    }
                    removeEntry(obj[key], keyToRemove, condition);
                } else if (typeof obj[key] === 'object') {
                    removeEntry(obj[key], keyToRemove, condition);
                }
            }
        }
    }
}

export function removeEntry2(obj: Record<string, any>, keyToRemove?: string, conditionForValue?: (value: string | object) => boolean): void {
    if (obj == null || typeof obj !== 'object') {
        return;
    }

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if ((keyToRemove && key === keyToRemove) || !keyToRemove) {
                if (conditionForValue) {
                    if (conditionForValue(obj[key])) {
                        delete obj[key];
                        continue;
                    }
                } else {
                    delete obj[key];
                }
            } else if (typeof obj[key] === 'object') {
                removeEntry(obj[key], keyToRemove, conditionForValue);
            }
        }
    }
}

export function isStatic(lane: Lane): boolean {
    let isTagged = lane.tags ? lane.tags.length > 0 : false;
    let cond = lane.priority !== undefined || lane.status !== undefined;
    let cond2 =  false; //lane.children.length === 0
    return isTagged || cond || cond2;
}
export function hashCode(str:string):number {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}