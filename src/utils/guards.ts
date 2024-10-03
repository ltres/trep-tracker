import{ priorityValues, statusValues }from"../types/constants";
import{ Container, Lane, Board, GanttTask, RecurringTask, Task, Status, Priority, Tag, RecurringTaskChild, Project }from"../types/types";

export function isLane( parent: Container | undefined ): parent is Lane{
  if( !parent ){
    return false;
  }
  return( parent as Lane )._type === 'lane';
}
export function isTask( parent: Container | undefined ): parent is Task{
  if( !parent ){
    return false;
  }
  return( parent as Task )._type === 'task';
}
export function assertIsTask( parent: Container | undefined ): asserts parent is Task{
  if( ! isTask( parent ) ){
    throw new Error( 'Not a Task' );
  }
}

export function isBoard( parent: Container | undefined ): parent is Board{
  if( !parent ){
    return false;
  }
  return( parent as Board )._type === 'board';
}

export function isContainers( target: Container[] | unknown ): target is Container[]{
  if( !target ){
    return false;
  }
  const c = target as Container[];
  return c.length === 0 || !c.find( e => !e.textContent );
}

export function assertIsContainers( target: Container[] | unknown ): asserts target is Container[]{
  if( !isContainers( target ) ){
    throw new Error( 'Not a Container[]' );
  }
}

export function isGanttTask( parent: Container | undefined ): parent is GanttTask{
  if( !parent ){
    return false;
  }
  return isTask( parent ) && !!parent.gantt;
}

export function assertIsGanttTask( parent: Container | undefined ): asserts parent is GanttTask{
  if( !isGanttTask( parent ) ){
    throw new Error( 'Not a ganttTask' );
  }
}
  
export function isRecurringTask( parent: Container | undefined ): parent is RecurringTask{
  if( !parent ){
    return false;
  }
  return isGanttTask( parent ) && !!parent.gantt.recurrence;
}

export function assertIsRecurringTask( parent: Container | undefined ): asserts parent is RecurringTask{
  if( !isRecurringTask( parent ) ){
    throw new Error( 'Not a RecurringTask' );
  }
}

export function isRecurringTaskChild( parent: Container | undefined ): parent is RecurringTaskChild{
  if( !parent ){
    return false;
  }
  return isGanttTask( parent ) && typeof parent.gantt.recurringChildIndex === 'number' && !!parent.gantt.fatherRecurringTaskId;
}

export function isProject( parent: Container | undefined ): parent is Project{
  if( !parent ){
    return false;
  }
  return isTask( parent ) && parent.children.length > 0;
}

export function assertIsRecurringTaskChild( parent: Container | undefined ): asserts parent is RecurringTaskChild{
  if( !isRecurringTaskChild( parent ) ){
    throw new Error( 'Not a RecurringTaskChild' );
  }
}
  
export function isLanes( parent: Container[] ): parent is Lane[]{
  return( parent[0] as Lane )._type === 'lane';
}
export function isTasks( parent: Container[] ): parent is Task[]{
  return( parent[0] as Task )._type === 'task';
}

export function isStatus( parent: unknown ): parent is Status{
  return  Object.keys( statusValues ).includes( parent as Status )
}

export function isStatusArray( parent: unknown[] ): parent is Status[]{
  return Array.isArray( parent ) && isStatus( parent[0] )
}

export function isPriority( parent: unknown ): parent is Priority{
  return  priorityValues.includes( parent as Priority )
}

export function isPriorityArray( parent: unknown[] ): parent is Priority[]{
  return Array.isArray( parent ) && isPriority( parent[0] )
}

export function isTag( parent: unknown | undefined ): parent is Tag{
  return!!parent && !!( parent as Tag ).tag
}

export function isTagArray( parent: unknown | unknown[] ): parent is Tag[]{
  return Array.isArray( parent ) && isTag( parent[0] )
}