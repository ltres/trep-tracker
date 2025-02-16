import{ priorityValues, statusValues }from"../types/constants";
import{ Container, Lane, Board, TimedTask, Task, Status, Priority, Tag, Project, FixedTimedTask, RollingTimedTask }from"../types/types";

export function isLane( parent: Container | undefined ): parent is Lane{
  if( !parent ){
    return false;
  }
  return( parent as Lane )._type === 'lane';
}
export function isTask( parent: Container | unknown ): parent is Task{
  if( !parent ){
    return false;
  }
  return( parent as Task )._type === 'task';
}
export function assertIsTask( parent: Container | unknown ): asserts parent is Task{
  if( ! isTask( parent ) ){
    throw new Error( 'Not a Task' );
  }
}

export function isBoard( parent: Container | unknown ): parent is Board{
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

export function isTimedTask( parent: Container | unknown ): parent is TimedTask{
  if( !parent ){
    return false;
  }
  return isTask( parent ) && !!parent.time;
}
export function assertIsTimedTask( target: Container | unknown ): asserts target is TimedTask{
  if( !isTimedTask( target ) ){
    throw new Error( 'Not a Container[]' );
  }
}

export function isFixedTimedTask( parent: Container | unknown ): parent is FixedTimedTask{
  if( !parent ){
    return false;
  }
  return isTimedTask( parent ) && parent.time.type === 'fixed';
}

export function assertIsFixedTimedTask( target: Container | unknown ): asserts target is FixedTimedTask{
  if( !isFixedTimedTask( target ) ){
    throw new Error( 'Not a Container[]' );
  }
}

export function isRollingTimedTask( parent: Container | unknown ): parent is RollingTimedTask{
  if( !parent ){
    return false;
  }
  return isTimedTask( parent ) && parent.time.type === 'rolling';
}

/*
export function assertIsGanttTask( parent: Container | undefined ): asserts parent is TimedTask{
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
*/
export function isProject( parent: Container | undefined ): parent is Project{
  if( !parent ){
    return false;
  }
  return isTask( parent ) && parent.children.length > 0;
}

/*
export function assertIsRecurringTaskChild( parent: Container | undefined ): asserts parent is RecurringTaskChild{
  if( !isRecurringTaskChild( parent ) ){
    throw new Error( 'Not a RecurringTaskChild' );
  }
}
*/
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