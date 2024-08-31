import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';
import { BoardService } from './board.service';
import { ContainerComponentRegistryService } from './registry.service';
import { Container, Task, getNewTask } from '../types/types';
import { getCaretPosition, isPlaceholder } from '../utils/utils';
import { isLane, isTask } from '../utils/guards';

@Injectable({
  providedIn: 'root',
})
export class KeyboardService {
  _keyboardEvent$: BehaviorSubject<KeyboardEvent | undefined> = new BehaviorSubject<KeyboardEvent | undefined>(undefined);

  constructor(
    private boardService: BoardService,
    private registry: ContainerComponentRegistryService,
  ){
    this._keyboardEvent$.subscribe(e => {
      if (e?.type != 'keydown' || !e || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Delete', 'Shift', 'd', 'a', 'f'].indexOf(e.key) === -1) {
        return;
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
        const res = this.getLastSelectedTaskData();
        if(!res){
          return
        }
        const caretPos = res.caretPos
        const nearby = e?.key === 'ArrowDown' ? this.boardService.getTaskInDirection(this.boardService.selectedTasks, 'down') : this.boardService.getTaskInDirection(this.boardService.selectedTasks, 'up');
        if (!nearby) {
          return;
        }
        const lane = this.boardService.findParentLane([nearby]);
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
            this.boardService.addToSelection(lane,nearby);
          }
        } else {
          // Select next/previous case
          this.boardService.activateEditorOnTask(lane , nearby, caretPos);
          this.boardService.clearSelectedTasks();
          this.boardService.addToSelection(lane,nearby);
        }
      } else if (e.key === 'ArrowRight' && e.ctrlKey === true) {
        // Make this task a child of the task on the top
        const wannaBeParent = this.boardService.getTaskInDirection(this.boardService.selectedTasks, 'up');
        if (!wannaBeParent) {
          throw new Error('Cannot find nearby task');
        }
        this.boardService.addAsChild(wannaBeParent, this.boardService.selectedTasks);
      } else if (e.key === 'ArrowLeft' && e.ctrlKey === true) {
        // Children task gets promoted to the same level as the parent
        const parent = this.boardService.findDirectParent(this.boardService.selectedTasks);
        if (!parent) {
          throw new Error('Cannot find parent task');
        }
        if (isLane(parent)) {
          return;
        }
        this.boardService.removeChildrenAndAddAsSibling(parent, this.boardService.selectedTasks);
      }else if(e.key === 'Enter'){
        const t = e.target as HTMLElement;
        if(t && !t.classList.contains('task-text-content')){
          return;
        }
        // Create new task
        const res = this.getLastSelectedTaskData();
        if(!res){
          return
        }
        const caretPos = res.caretPos

        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        // Create a new task
        /*
        if(!e.ctrlKey || !e.shiftKey){
          return;
        }*/
        let parentObject = this.boardService.findDirectParent(this.boardService.selectedTasks);
        let sibling: Container | undefined = this.boardService.lastSelectedTask?.task;
        while(parentObject && !isLane(parentObject)){
          sibling = parentObject;
          parentObject = this.boardService.findDirectParent([parentObject]);
        }
        if (!parentObject || !isLane(parentObject) || !isTask(sibling)) {
          throw new Error('Wrong parent or sibling');
        }
        const task = getNewTask(parentObject, undefined, '');
        /*
        let lane = isLane(parent) ? parent : this.boardService.findParentLane([parent]);
        if (!lane) {
          return;
        }*/

        this.boardService.addAsSiblings(parentObject, sibling, [task], !isPlaceholder(task) && caretPos === 0 ? 'before' : 'after');
        this.boardService.activateEditorOnTask(parentObject, task, 0);
        this.boardService.clearSelectedTasks();
        this.boardService.addToSelection(parentObject, task);
      }else if(e.key === 'Backspace' || e.key === 'Delete'){
        // Delete placeholder
        const res = this.getLastSelectedTaskData();
        if(!res){
          return
        }
        const task = res.task
        if( isPlaceholder(task) ){
          const bottomTask = this.boardService.getTaskInDirection(this.boardService.selectedTasks, e.key === 'Delete' ? 'down' : 'up');

          const lane = this.boardService.findParentLane([task]);
          if (!lane) {
            return;
          }
          this.boardService.deleteTask(task);
          this.boardService.clearSelectedTasks();

          if(bottomTask){
            this.boardService.activateEditorOnTask(lane, bottomTask, 0);
            this.boardService.addToSelection(lane,bottomTask);
          }
        }
      }
    });
  }

  private getLastSelectedTaskData(): {task: Task, el: Node | undefined, caretPos: number} | undefined {
    const task = this.boardService.lastSelectedTask?.task;
    if (!task) {
      return undefined
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
      task, el, caretPos,
    };

  }

  publishKeyboardEvent(event: KeyboardEvent | undefined) {
    this._keyboardEvent$.next(event);
  }

  get keyboardEvent$(): Observable<KeyboardEvent | undefined> {
    return this._keyboardEvent$;
  }

}
