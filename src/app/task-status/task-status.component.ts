import { Component, Input } from '@angular/core';
import { Board, Task, TaskStatus, TaskStatuses } from '../../types/task';
import { isPlaceholder } from '../../utils/utils';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'task-status[task][staticLane][board]',
  templateUrl: './task-status.component.html',
  styleUrl: './task-status.component.scss'
})
export class TaskStatusComponent {
  @Input() task!: Task;
  @Input() board!: Board;

  @Input() staticLane!: boolean;

  protected open = false;

  constructor(private boardService: BoardService) { }

  archive() {
    this.boardService.archive(this.board, this.task)
  }
  updateStatus(status: TaskStatus) {
    this.boardService.updateStatus(this.task, status);
    this.open = false;
  }

  isPlaceholder(): boolean {
    return isPlaceholder(this.task);
  }

  getAvailableStatuses(): TaskStatus[] {
    return Object.keys(TaskStatuses) as TaskStatus[];
  }

  getSymbol(arg0: TaskStatus): string {
    return TaskStatuses[arg0].icon;
  }

  getTooltip(arg0: TaskStatus): string {
    return arg0.toLowerCase().replaceAll('-', ' ');
  }

}
