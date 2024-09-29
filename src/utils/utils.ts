import{ v4 as uuidv4 }from'uuid';

import{ dateFormats, ganttConfig, layoutValues, tagHtmlWrapper, tagIdentifiers, tagTypes }from'../types/constants';
import{ addUnitsToDate, toIsoString }from'./date-utils';
import{ Lane, Container, GanttTask, Recurrence, Board, ISODateString, LayoutProperties, getLayouts, Layout, Task, getDefaultLocale, getStatesToArchive, Status }from'../types/types';
import{ isTask, isLane, isProject }from'./guards';
import stringSimilarity from'string-similarity-js';

export function generateUUID( length?: number ): string{
  return  uuidv4().substring( 0, length ?? 8 );
}

export function overlaps( DOMRect: DOMRect | undefined, DOMRect2: DOMRect | undefined ): boolean{
  if( !DOMRect || !DOMRect2 )return false;
  return DOMRect.x < DOMRect2.x + DOMRect2.width && DOMRect.x + DOMRect.width > DOMRect2.x
        && DOMRect.y < DOMRect2.y + DOMRect2.height && DOMRect.y + DOMRect.height > DOMRect2.y;
}

/**
 * Returns -1 if the coordinates are inside the rect, otherwise the distance between the coordinates and the rect
 * @param x 
 * @param y 
 * @param DOMRect 
 * @returns 
 */
export function cursorDistance( x: number, y: number, DOMRect: DOMRect | undefined ): number{
  if( !DOMRect )return 0;
  if( x > DOMRect.left && x < DOMRect.right &&
        y > DOMRect.top && y < DOMRect.bottom ){
    return-1
  };

  const dx = Math.max( DOMRect.left - x, 0, x - DOMRect.right );
  const dy = Math.max( DOMRect.top - y, 0, y - DOMRect.bottom );
  
  return Math.sqrt( dx * dx + dy * dy );
}

export function setCaretPosition( editableDiv: HTMLElement, position: number ){

  // Create a range and a selection object
  const range = document.createRange();
  const selection: Selection | null = window.getSelection();
  if( !selection ){
    console.warn( 'No selection found' );
    return;
  }
  // Function to calculate the text nodes and position within the nodes
  function getTextNodes( node: Node ){
    const textNodes = [] as Node[];
    function recurse( node: Node ){
      if( node.nodeType === 3 ){
        textNodes.push( node );
      }else{
        for( let i = 0; i < node.childNodes.length; i++ ){
          recurse( node.childNodes[i] );
        }
      }
    }
    recurse( node );
    return textNodes;
  }

  // Get all text nodes
  const textNodes = getTextNodes( editableDiv );

  // Initialize variables to track the remaining characters to skip
  let charCount = 0;
  let node;
  let offset: number = 0;

  for( let i = 0; i < textNodes.length; i++ ){
    if( ( charCount + ( textNodes[i]?.textContent?.length ?? 0 ) ) >= position ){
      node = textNodes[i];
      offset = position - charCount;
      break;
    }
    charCount += textNodes[i]?.textContent?.length ?? 0;
  }

  // If a node was found, set the range
  if( node ){
    range.setStart( node, offset );
    range.collapse( true );

    // Clear existing selection and add the new range
    selection.removeAllRanges();
    selection.addRange( range );
  }
}

export function getCaretPosition2(): number{
  try{
    return window.getSelection()?.getRangeAt( 0 ).endOffset ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }catch( e ){
    return 0;
  }
}

export function getCaretPosition( element: Node ){
  let caretOffset = 0;
  if( typeof window.getSelection != 'undefined' ){
    let range: Range | undefined;
    try{
      range = window.getSelection()?.getRangeAt( 0 );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }catch( e ){
      return 0;
    }
    if( !range )return 0;
    const preCaretRange: Range = range.cloneRange();
    preCaretRange.selectNodeContents( element );
    preCaretRange.setEnd( range.endContainer, range.endOffset );
    caretOffset = preCaretRange.endOffset;
  }
  return caretOffset;
}

export function getCaretCharacterOffsetWithin( element: HTMLElement & { document? : Document } ){
  let caretOffset = 0;
  const doc = element.ownerDocument || element.document;
  const win = doc.defaultView;
  if( !win ){
    throw new Error( 'No window' );
  }
  let sel;
  if( typeof win.getSelection != 'undefined' ){
    sel = win.getSelection();
    if( sel && sel.rangeCount > 0 ){
      const range = sel.getRangeAt( 0 );
      const preCaretRange:Range = range.cloneRange();
      preCaretRange.selectNodeContents( element );
      preCaretRange.setEnd( range.endContainer, range.endOffset );
      caretOffset = preCaretRange.toString().length;
    }
  }else{
    throw new Error( 'Cannot find selection' );
  }
  return caretOffset;
}

export function isPlaceholder( task: Task ){
  return task.textContent === '';
}

export function isArchive( lane: Lane ){
  return lane.isArchive;
}

export function setStatusPath( value: string ){
  localStorage.setItem( 'storagePath', value );
}

export function getStatusPath(): string | null{
  return localStorage.getItem( 'storagePath' );
}

export function isStatic( lane: Lane ): boolean{
  const isTagged = lane.tags ? lane.tags.length > 0 : false;
  const cond = lane.priority !== undefined || lane.status !== undefined || lane.endTimeframe !== undefined || lane.startTimeframe !== undefined; 
  const cond2 = false; //lane.children.length === 0
  return isTagged || cond || cond2;
}
export function hashCode( str: string ): number{
  let hash = 0;
  for( let i = 0, len = str.length; i < len; i++ ){
    const chr = str.charCodeAt( i );
    hash = ( hash << 5 ) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }

  return hash;
}

export function getFirstMentionTag( task: Task ): string | undefined{
  const mentionTagType = tagTypes.tagOrange;
  const mention = task.tags.find( t => t.type === mentionTagType );
  if( mention ){
    return tagHtmlWrapper( mentionTagType )[0] + tagIdentifiers.find( r => r.type === mentionTagType )?.symbol + mention.tag + tagHtmlWrapper( mentionTagType )[1];
  }
  return'';
}

/**
 * Computes similarity between two tags, as in rate of tags shared multiplied by string similarity:
 * @param task1 
 * @param task2 
 * @returns 
 */
export function checkTaskSimilarity( task1: Task, task2: Task ): number{
  const t1 = task1.tags.sort().map( t => t.tag.toLowerCase() );
  const t2 = task2.tags.sort().map( t => t.tag.toLowerCase() );

  const text1 = stripHTML( task1.textContent )
  const text2 = stripHTML( task2.textContent )

  // rate is tags shared / total number of tags
  const tagsSharedCount = t1.filter( t => t2.includes( t ) ).length;
  const totalTagsCount = t1.length + t2.length - tagsSharedCount;
  return totalTagsCount > 0 ? tagsSharedCount / totalTagsCount * stringSimilarity( text1,text2 ) : stringSimilarity( text1,text2 )
}

/**
 * Retrieves all descendants of a given container.
 * @param container - The container whose descendants are to be retrieved.
 * @returns An array of Container objects representing the descendants.
 */
export function getDescendants( container: Container ): Container[]{
  let descendants: Container[] = [];
  for( const child of container.children ){
    descendants = descendants.concat( child ).concat( getDescendants( child ) );
  }

  return descendants;
}

/**
 * Generates a color basing on text hash
 */
export function textToHexColor( text: string ): string{
  let hash = 0;

  // Generate a hash from the input text
  for( let i = 0; i < text.length; i++ ){
    const charCode = text.toLowerCase().charCodeAt( i );
    hash = ( hash * 31 + charCode ) % 0xFFFFFF;
  }

  // Extract RGB components from the hash
  const r = ( hash >> 16 ) & 0xFF;
  const g = ( hash >> 8 ) & 0xFF;
  const b = hash & 0xFF;

  // Convert RGB components to HEX string
  const hexColor = `#${r.toString( 16 ).padStart( 2, '0' )}${g.toString( 16 ).padStart( 2, '0' )}${b.toString( 16 ).padStart( 2, '0' )}`;

  return hexColor;
}

/**
 * Generates a number basing on text hashh
 * @param to: the limit
 */
export function textToNumber( text: string, to?: number ): number{
  let hash = 0;

  for( let i = 0; i < text.length; i++ ){
    const charCode = text.toLowerCase().charCodeAt( i );
    hash = ( hash * 31 + charCode ) % ( to ?? 256 );
  }

  return hash;
}

/** Initializes the gantt data for a task.
   * @param startDate : if set, will be the task start date
   * Check the gantt-constants for config used.
  */
export function initGanttData( task: Task, startDateIso?: Date | undefined ): GanttTask{
  if( task.gantt ){
    return task as GanttTask;
  }
  let startDate = startDateIso ?? new Date();
  if( ganttConfig.skipWeekendsInPlanning && ( startDate.getUTCDay() == 6 || startDate.getUTCDay() == 0 ) ){
    // Plan for next monday
    startDate = addUnitsToDate( startDate, startDate.getUTCDay() == 0 ? 1 : 2, 'day' );
  }

  let endDate = new Date( Date.UTC( startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() + ganttConfig.baseTaskDuration ) );
  if( ganttConfig.skipWeekendsInPlanning && ( endDate.getUTCDay() == 6 || endDate.getUTCDay() == 0 ) ){
    // Plan for next monday
    endDate = addUnitsToDate( endDate, endDate.getUTCDay() == 0 ? 1 : 2, 'day' );
  }
  task.gantt = {
    showData: true,
    startDate: toIsoString( startDate ),
    endDate:  toIsoString( endDate ),
    progress: 0,
    successors: [],
    recurrence: undefined
  };
  return task as GanttTask;
}

export function getTaskBackgroundColor( text:string ){
  return`hsl(${textToNumber( text,357 )}, 50%, 40%, 0.6)`
}

export function mapToGanttRecurrence( r : Recurrence ): 'day' | 'week' | 'month' | 'year'{
  switch( r ){
    case'daily'.toString():
      return"day"
    case'weekly'.toString():
      return"week"
    case'monthly'.toString():
      return"month";
    case'yearly'.toString():
      return"year"
  }
  return"day"
}

export function getRecurrenceId( taskId: string, index: number ){
  return`${taskId}-recurrence-${index}`
}

export function getProjectComputedStatus( task: Task ): Status{
  if( !isProject( task ) ){
    throw  new Error( "Task is not a project" )
  }
  // If all children share a state, project is in that state:
  const states = task.children.map( c => isProject( c ) ? getProjectComputedStatus( c ) : c.status );
  if( states.every( e => e === states[0] ) ){
    return states[0];
  }

  // otherwise, project is 'in progress'
  return"in-progress";
}

export function stripHTML( text: string ){
  return text.replace( /<[^>]*>/g, '' ).replace( /\u00A0/g, ' ' );
}

/**
 * Data model has undergone some changes in time. This method ensures that all the statuses get brought to the latest version.
 * @param board 
 * @returns 
 */
export function eventuallyPatch( board: Board ): Board{
  board._type = 'board';
  board.layout = board.layout ?? 'absolute';
  if( !board.datesConfig ){
    board.datesConfig = {
      locale: getDefaultLocale(),
      dateFormat: dateFormats['boardDateFormat']
    }
  }

  const des = getDescendants( board );
  des.forEach( p => {
    if( !p.creationDate ){
      p.creationDate = new Date().toISOString() as ISODateString;
    }
    if( typeof p.priority == 'undefined' ){
      p.priority = undefined;
    }
    if( !p.dates ){
      p.dates = {};
    }
    if( isTask( p ) ){
      const mayBeOldTask: Task & {
        includeInGantt?: boolean,
        archived?:boolean,
        archivedDate?: ISODateString,
        stateChangeDate?: ISODateString,
        createdLaneId?: string | undefined;
        order?: number;
        
      } = p

      if( !mayBeOldTask.similarTasks ){
        mayBeOldTask.similarTasks = []
      }

      // cleanup successors
      if( mayBeOldTask.gantt?.successors ){
        for( const succ of  mayBeOldTask.gantt.successors ){
          if( !des.find( d => d.id === succ.taskId ) ){
            mayBeOldTask.gantt.successors = mayBeOldTask.gantt.successors.filter( s => s.taskId !== succ.taskId )
          }
        }
      }

      // createdLaneId removal
      if( mayBeOldTask.createdLaneId ){
        delete mayBeOldTask.createdLaneId
      }

      // cleanup orders
      if( mayBeOldTask.gantt?.order ){
        for( const ord of  Object.keys( mayBeOldTask.gantt.order ) ){
          if( ord === 'board' ){
            // Skip board order
            continue;
          }
          if( !des.find( d => d.id === ord ) ){
            delete mayBeOldTask.gantt.order[ord]
          }
        }
      }

      if( mayBeOldTask.includeInGantt ){
        delete mayBeOldTask.includeInGantt;
      }
      if( typeof mayBeOldTask.order === 'number' ){
        delete mayBeOldTask.order
      }
      if( !mayBeOldTask.dates ){
        mayBeOldTask.dates = {}
      }
      if( mayBeOldTask.archived ){
        mayBeOldTask.status = 'archived';
        mayBeOldTask.dates.archived = { enter: mayBeOldTask.archivedDate ?? new Date().toISOString() as ISODateString };
      }
      if( mayBeOldTask.stateChangeDate && mayBeOldTask.status && mayBeOldTask.status !== 'archived' ){
        mayBeOldTask.dates[mayBeOldTask.status] = { enter: mayBeOldTask.stateChangeDate ?? new Date().toISOString() as ISODateString };
      }
      if( mayBeOldTask.creationDate && ( !mayBeOldTask.dates['todo'] || !mayBeOldTask.dates['todo'].enter ) ){
        if( !mayBeOldTask.dates['todo'] ){
          mayBeOldTask.dates['todo'] = {};
        }
        mayBeOldTask.dates['todo']['enter'] = mayBeOldTask.creationDate;
        mayBeOldTask.dates['todo']['leave'] = mayBeOldTask.stateChangeDate;
      }
    }

    if( isLane( p ) ){
      const mayBeOldLane: Lane & {
        archive?: boolean
        layouts?: LayoutProperties | undefined,
        collapsed?: boolean
      } = p

      if( !mayBeOldLane.layouts ){
        mayBeOldLane.layouts = getLayouts();
      }
      if( !mayBeOldLane.collapsed ){
        mayBeOldLane.collapsed = false;
      }
      for( const layout of Object.keys( layoutValues ) ){
        const l = layout as Layout;
        const thisColLayout = mayBeOldLane.layouts[l];
        if( thisColLayout.column > layoutValues[l].columns - 1 ){
          thisColLayout.column = layoutValues[l].columns - 1;
        }
      }

      if( typeof mayBeOldLane.isArchive === 'undefined' ){
        mayBeOldLane.isArchive = mayBeOldLane.archive ?? false;
      }
      if( mayBeOldLane.isArchive ){
        // Case for archived tasks that are children of archived tasks. They should be moved to the archive lane.
        const descendants = getDescendants( mayBeOldLane );
        const archivedFirstLevel = mayBeOldLane.children.filter( c => getStatesToArchive().includes( c.status ) );
        archivedFirstLevel.forEach( a => {
          const findInDescendants = descendants.filter( d => d.id === a.id );
          if( findInDescendants.length > 1 ){
            // this is a task that is a child of an archived task. Remove from direct descendants.
            mayBeOldLane.children = mayBeOldLane.children.filter( c => c.id !== a.id );
          }
        } );
      }
    }

    // maybe some tags types are missing
    if( p.tags ){
      p.tags.forEach( t => {
        if( !t.type ){
          if( p.textContent.toLowerCase().indexOf( `${tagIdentifiers[0].symbol}${t.tag.toLowerCase()}` ) >= 0 ){
            t.type = tagIdentifiers[0].type;
          }else if( p.textContent.toLowerCase().indexOf( `${tagIdentifiers[1].symbol}${t.tag.toLowerCase()}` ) >= 0 ){
            t.type = tagIdentifiers[1].type;
          }
        }
      } );
    }
  } );

  return board;
}