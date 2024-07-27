import { Component, ElementRef, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { Container } from '../../types/types';
import { ContainerComponentRegistryService } from '../../service/registry.service';

// A base compoent whose data model is a Container
// This component is responsible for managing subscriptions and unsubscribing them
// Also subscribes and unsubscribes from component registry.
@Component({
  selector: 'app-base',
  //standalone: true,
  //imports: [],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss'
})
export abstract class ContainerComponent implements OnInit, OnDestroy{
  protected _container!: Container;
  protected _subscriptions: Subscription[] = [];
  
  constructor(
    protected registry: ContainerComponentRegistryService,
    public el: ElementRef
  ) { } 

  abstract get container(): Container | undefined;

  set subscriptions(subscriptions: Subscription) {
    this._subscriptions.push(subscriptions);
  }

  ngOnInit(): void {
    this.registry.componentInitialized(this);
  }
  ngOnDestroy(): void {
    this._subscriptions.forEach(subscription => subscription.unsubscribe());
    this.registry.componentDestroyed(this);
  }
}
