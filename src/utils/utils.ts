import { v4 as uuidv4 } from 'uuid';

export function generateUUID(): string {
    return uuidv4().substring(0,6);
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

export function setCaretPosition( editableDiv: HTMLElement, position: number,) {

    // Create a range and a selection object
    const range = document.createRange();
    const selection = window.getSelection();
    if(!selection){
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
        if ((charCount + (textNodes[i]?.textContent?.length ?? 0))  >= position) {
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

export function getCaretPosition2(): number{
    try{
        return window.getSelection()?.getRangeAt(0).endOffset ?? 0;
    }catch(e){
        return 0;
    }
}

export function getCaretPosition(element: Node) {
    var caretOffset = 0;
    if (typeof window.getSelection != "undefined") {
        var range: Range | undefined;
        try{
            range = window.getSelection()?.getRangeAt(0);
        }catch(e){
            return 0;
        }
        if(!range)return 0;
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
}