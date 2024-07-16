import { Component, Injectable } from "@angular/core";

import { BehaviorSubject, Observable } from "rxjs";
import { BoardService } from "./board.service";
import { ContainerComponentRegistryService } from "./registry.service";
import { Container, Lane, Task, getNewTask } from "../types/task";
import { getCaretPosition, isPlaceholder } from "../utils/utils";

@Injectable({
  providedIn: 'root'
})
export class KeyboardService {
  _keyboardEvent$: BehaviorSubject<KeyboardEvent | undefined> = new BehaviorSubject<KeyboardEvent | undefined>(undefined);

  constructor(
    private boardService: BoardService,
    private registry: ContainerComponentRegistryService
  ){
    this._keyboardEvent$.subscribe(e => {
      if (e?.type != 'keydown' || !e || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Delete', 'Shift', 'd', 'a', 'f'].indexOf(e.key) === -1) {
        return
      }
      /*
      if(e.key === 'd' && e.ctrlKey === true){
        // Mark as Done selected tasks
        e.preventDefault();
        this.boardService.selectedTasks?.filter(t => !isPlaceholder(t) ).forEach(t => this.boardService.nextStatus(t) );
      }else if(e.key === 'a' && e.ctrlKey === true){
        // Archive tasks
        let board = this.boardService.selectedBoard;
        if(!board)return;
        e.preventDefault();
        this.boardService.selectedTasks?.filter(t => !isPlaceholder(t) ).forEach(t => this.boardService.evaluateArchiveMove(board,t) );
      }else */
      if(e.key === 'f' && e.ctrlKey === true){
        // Focus search input
        this.boardService.focusSearch();
      }else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        let {task, el, caretPos} = this.getLastSelectedTaskData();

        let nearby = e?.key === 'ArrowDown' ? this.boardService.getTaskInDirection(this.boardService.selectedTasks, "down") : this.boardService.getTaskInDirection(this.boardService.selectedTasks, "up");   
        if (!nearby) {
          return;
        }
        let lane = this.boardService.findParentLane([nearby]);
        if (!lane) {
          return;
        }
        if (e.shiftKey === true) {
          if(e.ctrlKey === true) {
            // Move case
            this.boardService.switchPosition(this.boardService.selectedTasks, e.key);
          }else{
            // Select multiple case
            this.boardService.activateEditorOnTask(lane, nearby, caretPos);
            this.boardService.addToSelection(nearby);
          }
        } else {
          // Select next/previous case
          this.boardService.activateEditorOnTask(lane , nearby, caretPos);
          this.boardService.clearSelectedTasks();
          this.boardService.addToSelection(nearby);
        }
      } else if (e.key === 'ArrowRight' && e.ctrlKey === true) {
        // Make this task a child of the task on the top
        let wannaBeParent = this.boardService.getTaskInDirection(this.boardService.selectedTasks, "up");
        if (!wannaBeParent) {
          throw new Error("Cannot find nearby task")
        }
        this.boardService.addAsChild(wannaBeParent, this.boardService.selectedTasks);
      } else if (e.key === 'ArrowLeft' && e.ctrlKey === true) {
        // Children task gets promoted to the same level as the parent
        let parent = this.boardService.findDirectParent(this.boardService.selectedTasks);
        if (!parent) {
          throw new Error("Cannot find parent task")
        }
        if (this.boardService.isLane(parent)) {
          return;
        }
        this.boardService.removeChildrenAndAddAsSibling(parent, this.boardService.selectedTasks);
      }else if(e.key === 'Enter'){
        // Create new task
        let {task:selTask, el, caretPos} = this.getLastSelectedTaskData();

        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        // Create a new task
        /*
        if(!e.ctrlKey || !e.shiftKey){
          return;
        }*/
        let parentObject = this.boardService.findDirectParent(this.boardService.selectedTasks);
        let sibling: Container | undefined = this.boardService.lastSelectedTask;
        while(parentObject && !this.boardService.isLane(parentObject)){
          sibling = parentObject
          parentObject = this.boardService.findDirectParent([parentObject]);
        }
        if (!parentObject || !this.boardService.isLane(parentObject) || !this.boardService.isTask(sibling)) {
          throw new Error("Wrong parent or sibling");
        }
        let task = getNewTask(parentObject,"")
        /*
        let lane = this.boardService.isLane(parent) ? parent : this.boardService.findParentLane([parent]);
        if (!lane) {
          return;
        }*/

        this.boardService.addAsSiblings(parentObject, sibling, [task], !isPlaceholder(task) && caretPos === 0 ? "before" : "after");
        this.boardService.activateEditorOnTask(parentObject, task, 0);
        this.boardService.clearSelectedTasks();
        this.boardService.addToSelection(task);
      }else if(e.key === 'Backspace' || e.key === 'Delete'){
        // Delete placeholder

        let {task, el, caretPos} = this.getLastSelectedTaskData();
        if( isPlaceholder(task) ){
          let bottomTask = this.boardService.getTaskInDirection(this.boardService.selectedTasks, e.key === 'Delete' ? "down" : "up");
          if (!bottomTask) {
            return;
          }
          let lane = this.boardService.findParentLane([task]);
          if (!lane) {
            return;
          }
          this.boardService.deleteTask(task);
          this.boardService.activateEditorOnTask(lane, bottomTask, 0);
          this.boardService.clearSelectedTasks();
          this.boardService.addToSelection(bottomTask);
        }
      }
    });
  }

  private getLastSelectedTaskData(): {task: Task, el: Node | undefined, caretPos: number} { 
    let task = this.boardService.lastSelectedTask;
    if (!task) {
      throw new Error("Cannot find lane or task")
    }
    let el: Node | undefined;
    this.registry.componentRegistry.forEach(c => {
      if (c.container && c.container.id === task.id && c.container._type === task._type) {
        el = c.el.nativeElement;
      }
    });
    let caretPos = 0;
    if(el) {
      caretPos = getCaretPosition(el);
    }
    return{
      task, el, caretPos
    }

  }

  publishKeyboardEvent(event: KeyboardEvent | undefined) {
    this._keyboardEvent$.next(event);
  }

  get keyboardEvent$(): Observable<KeyboardEvent | undefined> {
    return this._keyboardEvent$;
  }

}
