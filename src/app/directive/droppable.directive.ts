import { ChangeDetectorRef, Directive, ElementRef, Input, OnDestroy, OnInit } from "@angular/core";
import { Container } from "../../types/types";
import { ContainerComponentRegistryService } from "../../service/registry.service";
import { DragService } from "../../service/drag.service";
import { Subscription } from "rxjs";
import { isBoard, isLane, isTask } from "../../utils/guards";
import { cursorIsInside, getDescendants, isStatic } from "../../utils/utils";
import { BoardService } from "../../service/board.service";

/**
 * A directive for object which can receive a container drop
 */
@Directive({
  selector: '[droppable][container][executeOnDropReceived]',
})
export class DroppableDirective implements OnInit, OnDestroy {
  @Input() droppable!: number; // the priority for stacked dropzones
  @Input() container!: Container;

  somethingIsDragging = false;
  /**
   * Function to execute whenever a container is dropped on this directive
   */
  @Input() executeOnDropReceived!: (container: Container, event?: DragEvent) => void;
  protected _subscriptions: Subscription[] = [];

  constructor(
    private registryService: ContainerComponentRegistryService,
    private dragService: DragService,
    private boardService: BoardService,

    private cdf: ChangeDetectorRef,
    public el: ElementRef){
  }

  /**
   * When a drag starts, this method is used to verify if the dragged object could be dropped on that droppable.
   */
  private canBeDroppedHere(d: Container): boolean{
    if( isLane(this.container) ){
      if(isStatic(this.container)){
        return false; // static lanes are not droppable
      }
      if( isLane(d) ){
        return false; // lane on lane
      }else if( isTask(d) ){
        return true; // task on lane
      }else if( isBoard(d) ){
        return false; // board on lane
      }
      return true;
    }else if( isTask(this.container) ){
      if( isLane(d) ){
        return false; // lane on task
      }else if( isTask(d) ){
        if( d.id === this.container.id ){
          return false // same task
        }else if( getDescendants(d).map( des => des.id ).includes( this.container.id ) ){
          return false // a parent object cannot be dropped on a child object
        }
        return true; // task on task
      }else if( isBoard(d) ){
        return false; // board on task
      }
    }else if( isBoard(this.container) ){
      if( isLane(d) ){
        return true; // lane on board
      }else if( isTask(d) ){
        return true; // floating lane case
      }else if( isBoard(d) ){
        return false; // board on lane
      }
    }
    return false
  }

  ngOnInit(): void {
    this.registryService.componentInitialized(this);
    this._subscriptions.push(this.dragService.dragStartEvent$.subscribe( c => {
      this.somethingIsDragging = true;
      if( this.canBeDroppedHere(c) ){
        this.el.nativeElement.classList.add('something-is-dragging')
      }
    }));
    this._subscriptions.push(this.dragService.dragChecksEnded$.subscribe( ()=> {
      this.somethingIsDragging = false;
      this.el.nativeElement.classList.remove('something-is-dragging')
      this.el.nativeElement.classList.remove('something-is-dragging-and-i-am-hovered')

    }));
    this._subscriptions.push(this.dragService.draggingCoodinates$.subscribe( (c) => {
      if(!this.somethingIsDragging) return;
      if( cursorIsInside(c.x,c.y, this.el.nativeElement.getBoundingClientRect()) ){
        this.el.nativeElement.classList.add('something-is-dragging-and-i-am-hovered')
      }else{
        this.el.nativeElement.classList.remove('something-is-dragging-and-i-am-hovered')
      }
    }))
  }
  ngOnDestroy(): void {
    this.registryService.componentDestroyed(this);
    this._subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
