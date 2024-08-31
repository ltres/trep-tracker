import { Directive, ElementRef, Input, OnDestroy, OnInit } from "@angular/core";
import { Container } from "../../types/types";
import { ContainerComponentRegistryService } from "../../service/registry.service";

/**
 * A directive for object which can receive a container drop
 */
@Directive({
  selector: '[droppable][container][executeOnDropReceived]',
})
export class DroppableDirective implements OnInit, OnDestroy {
  @Input() container!: Container;
  @Input() executeOnDropReceived!: (container: Container, event?: DragEvent) => void;

  constructor(
    private registryService: ContainerComponentRegistryService,
    public el: ElementRef){
    
  }

  ngOnInit(): void {
    this.registryService.componentInitialized(this);
  }
  ngOnDestroy(): void {
    this.registryService.componentDestroyed(this);
  }

}
