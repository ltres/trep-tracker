import { priorityValues, statusValues } from "../types/constants";
import { Container, Lane, Board, GanttTask, RecurringGanttTask, Task, Status, Priority, Tag } from "../types/types";

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
export function isBoard(parent: Container | undefined): parent is Board {
  if (!parent) {
    return false;
  }
  return (parent as Board)._type === 'board';
}
  
export function isGanttTask(parent: Container | undefined): parent is GanttTask {
  if (!parent) {
    return false;
  }
  return isTask(parent) && !!parent.gantt;
}
  
export function isRecurringGanttTask(parent: Container | undefined): parent is RecurringGanttTask {
  if (!parent) {
    return false;
  }
  return isGanttTask(parent) && !!parent.gantt.recurrence && !!parent.gantt.nextRecurrenceStartDate && !!parent.gantt.nextRecurrenceEndDate;
}
  
export function isLanes(parent: Container[]): parent is Lane[] {
  return (parent[0] as Lane)._type === 'lane';
}
export function isTasks(parent: Container[]): parent is Task[] {
  return (parent[0] as Task)._type === 'task';
}

export function isStatus(parent: unknown): parent is Status {
  return  Object.keys(statusValues).includes(parent as Status)
}

export function isStatusArray(parent: unknown[]): parent is Status[] {
  return isStatus(parent[0])
}

export function isPriority(parent: unknown): parent is Priority {
  return  priorityValues.includes(parent as Priority)
}

export function isPriorityArray(parent: unknown[]): parent is Priority[] {
  return isPriority(parent[0])
}

export function isTag(parent: unknown): parent is Tag {
  return !!(parent as Tag).tag
}

export function isTagArray(parent: unknown[]): parent is Tag[] {
  return isTag(parent[0])
}