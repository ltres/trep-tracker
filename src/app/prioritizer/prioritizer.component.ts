import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Container, Priority } from '../../types/task';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'prioritizer[container]',

  templateUrl: './prioritizer.component.html',
  styleUrl: './prioritizer.component.scss'
})
export class PrioritizerComponent implements AfterViewInit{

  @Input() container!: Container;
  @Input() multipleSelectable: boolean = false;
  @Input() allowEmpty: boolean = false;

  @Output() onPrioritySelected = new EventEmitter<Priority[]>();
  
  protected priorities: Priority[] | undefined = [];
  protected open: boolean = false;

  constructor(
    private eRef: ElementRef,
    private boardService: BoardService) {
  }
  ngAfterViewInit(): void {
    this.priorities = Array.isArray(this.container.priority) ? this.container.priority : (this.container.priority ? [this.container.priority] : []);
  }

  getSymbol(number: number | undefined): string {
    if(number === undefined) return ""
    return "●"
  }

  togglePriority(priority: Priority) {
    if(this.multipleSelectable){
      this.priorities = this.priorities?.includes(priority) ? this.priorities.filter(p => p !== priority) : ( this.priorities ? [...this.priorities, priority] : [priority]);
    }else{
      this.priorities = [priority];
    }
    this.onPrioritySelected.emit(this.priorities);
    //this.boardService.publishBoardUpdate();
    this.open = false;
  }
  cancelAndClose(){
    if(this.allowEmpty){
      this.priorities = undefined;
    }
    this.onPrioritySelected.emit(this.priorities);
    this.open = false;
  }
  priorityPresent(arg0: Priority): boolean {
    return this.priorities ? this.priorities.includes(arg0): false;
  }
}
