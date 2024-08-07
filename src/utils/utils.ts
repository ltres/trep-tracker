import { v4 as uuidv4 } from 'uuid';
import { Lane, Task, Status, ISODateString, Container, DayDateString, tagHtmlWrapper, tagIdentifiers, Board, getLayouts, Layout, Layouts, LayoutProperties } from '../types/types';

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

export function setCaretPosition(editableDiv: HTMLElement, position: number) {

  // Create a range and a selection object
  const range = document.createRange();
  const selection: Selection | null = window.getSelection();
  if (!selection) {
    console.warn('No selection found');
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return 0;
  }
}

export function getCaretPosition(element: Node) {
  let caretOffset = 0;
  if (typeof window.getSelection != 'undefined') {
    let range: Range | undefined;
    try {
      range = window.getSelection()?.getRangeAt(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return 0;
    }
    if (!range) return 0;
    const preCaretRange: Range = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.endOffset;
  }
  return caretOffset;
}

export function getCaretCharacterOffsetWithin(element: HTMLElement & { document? : Document }) {
  let caretOffset = 0;
  const doc = element.ownerDocument || element.document;
  const win = doc.defaultView;
  if(!win){
    throw new Error('No window');
  }
  let sel;
  if (typeof win.getSelection != 'undefined') {
    sel = win.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  } else {
    throw new Error('Cannot find selection');
  }
  return caretOffset;
}

export function isPlaceholder(task: Task) {
  return task.textContent === '';
}

export function isArchive(lane: Lane) {
  return lane.isArchive;
}

export function setStatusPath(value: string) {
  localStorage.setItem('storagePath', value);
}

export function getStatusPath(): string | null {
  return localStorage.getItem('storagePath');
}

export function getNextStatus(t: Task): Status {
  if (t.status === 'todo') return 'in-progress';
  if (t.status === 'in-progress') return 'completed';
  if (t.status === 'completed') return 'archived';
  return 'todo';
}

export function setDateSafe(container: Container, status: Status, enterOrLeave: 'enter' | 'leave', date: Date) {
  if (!container.dates[status]) {
    container.dates[status] = {};
  }
    container.dates[status]![enterOrLeave] = date.toISOString() as ISODateString;
}

export function getIsoString(date: Date): ISODateString {
  return date.toISOString() as ISODateString;
}

export function getDayDate(date: Date): DayDateString {
  const formattedDate = `${date.getDate() >= 10 ? date.getDate() : '0' + date.getDate()}-${date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1)}-${date.getFullYear()}`;
  return formattedDate as DayDateString;
}

export function formatDate(date: ISODateString | undefined) {
  if(!date){
    console.warn("format date called on empty object");
    return ""
  }
  return new Date(date).toLocaleDateString();
}

export function isStatic(lane: Lane): boolean {
  const isTagged = lane.tags ? lane.tags.length > 0 : false;
  const cond = lane.priority !== undefined || lane.status !== undefined;
  const cond2 = false; //lane.children.length === 0
  return isTagged || cond || cond2;
}
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }

  return hash;
}

export function getFirstMentionTag(task: Task) {
  const mentionTagType = 'tag-orange';
  const mention = task.tags.find(t => t.type === mentionTagType);
  if (mention) {
    return tagHtmlWrapper(mentionTagType)[0] + tagIdentifiers.find(r => r.type === mentionTagType)?.symbol + mention.tag + tagHtmlWrapper(mentionTagType)[1];
  }
  return '';
}

export function isLane(parent: Container | undefined): parent is Lane {
  if (!parent) {
    return false;
  }
  return (parent as Lane)._type === 'lane';
}
export function isTask(parent: Container | undefined): parent is Task {
  if (!parent) {
    return false;
  }
  return (parent as Task)._type === 'task';
}
export function isLanes(parent: Container[]): parent is Lane[] {
  return (parent[0] as Lane)._type === 'lane';
}
export function isTasks(parent: Container[]): parent is Task[] {
  return (parent[0] as Task)._type === 'task';
}

/**
 * Retrieves all descendants of a given container.
 * @param container - The container whose descendants are to be retrieved.
 * @returns An array of Container objects representing the descendants.
 */
export function getDescendants(container: Container): Container[] {
  let descendants: Container[] = [];
  for (const child of container.children) {
    descendants = descendants.concat(child).concat(getDescendants(child));
  }

  return descendants;
}

/**
 * Data model has undergone some changes in time. This method ensures that all the statuses get brought to the latest version.
 * @param board 
 * @returns 
 */
export function eventuallyPatch( board: Board ): Board{
  board._type = 'board';
  board.layout = board.layout ?? 'absolute';
  const des = getDescendants(board);
  des.forEach(p => {
    if (!p.creationDate) {
      p.creationDate = new Date().toISOString() as ISODateString;
    }
    if (typeof p.priority == 'undefined') {
      p.priority = undefined;
    }
    if(!p.dates){
      p.dates = {};
    }
    if(isTask(p)){
      const mayBeOldTask: Task & {
        includeInGantt?: boolean,
        archived?:boolean,
        archivedDate?: ISODateString,
        stateChangeDate?: ISODateString,
        createdLaneId?: string | undefined;
      } = p

      if(typeof mayBeOldTask.includeInGantt === 'undefined'){
        mayBeOldTask.includeInGantt = false;
      }
      if(!mayBeOldTask.dates){
        mayBeOldTask.dates = {}
      }
      if(mayBeOldTask.archived ){
        mayBeOldTask.status = 'archived';
        mayBeOldTask.dates.archived = { enter: mayBeOldTask.archivedDate ?? new Date().toISOString() as ISODateString };
      }
      if( mayBeOldTask.stateChangeDate && mayBeOldTask.status && mayBeOldTask.status !== 'archived' ){
        mayBeOldTask.dates[mayBeOldTask.status] = { enter: mayBeOldTask.stateChangeDate ?? new Date().toISOString() as ISODateString };
      }
      if( mayBeOldTask.creationDate && (!mayBeOldTask.dates['todo'] || !mayBeOldTask.dates['todo'].enter) ){
        if(!mayBeOldTask.dates['todo']){
          mayBeOldTask.dates['todo'] = {};
        }
        mayBeOldTask.dates['todo']['enter'] = mayBeOldTask.creationDate;
        mayBeOldTask.dates['todo']['leave'] = mayBeOldTask.stateChangeDate;
      }
    }

    if(isLane(p)){
      const mayBeOldLane: Lane & {
        archive?: boolean
        layouts?: LayoutProperties | undefined,
        collapsed?: boolean
      } = p

      if(!mayBeOldLane.layouts){
        mayBeOldLane.layouts = getLayouts();
      }
      if(!mayBeOldLane.collapsed){
        mayBeOldLane.collapsed = false;
      }
      for( const layout of Object.keys(Layouts) ){
        const l = layout as Layout;
        const thisColLayout = mayBeOldLane.layouts[l];
        if( thisColLayout.column > Layouts[l].columns - 1 ){
          thisColLayout.column = Layouts[l].columns - 1;
        }
      }

      if(typeof mayBeOldLane.isArchive === 'undefined'){
        mayBeOldLane.isArchive = mayBeOldLane.archive ?? false;
      }
      if( mayBeOldLane.isArchive ){
        // Case for archived tasks that are children of archived tasks. They should be moved to the archive lane.
        const descendants = getDescendants(mayBeOldLane);
        const archivedFirstLevel = mayBeOldLane.children.filter(c => c.status === 'archived');
        archivedFirstLevel.forEach(a => {
          const findInDescendants = descendants.filter(d => d.id === a.id);
          if(findInDescendants.length > 1){
            // this is a task that is a child of an archived task. Remove from direct descendants.
            mayBeOldLane.children = mayBeOldLane.children.filter(c => c.id !== a.id);
          }
        });
      }
    }

    // maybe some tags types are missing
    if (p.tags) {
      p.tags.forEach(t => {
        if (!t.type) {
          if (p.textContent.toLowerCase().indexOf(`${tagIdentifiers[0].symbol}${t.tag.toLowerCase()}`) >= 0) {
            t.type = tagIdentifiers[0].type;
          } else if (p.textContent.toLowerCase().indexOf(`${tagIdentifiers[1].symbol}${t.tag.toLowerCase()}`) >= 0) {
            t.type = tagIdentifiers[1].type;
          }
        }
      });
    }
  });

  return board;
}