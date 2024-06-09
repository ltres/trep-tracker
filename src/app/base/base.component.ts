import { Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Container } from '../../types/task';
import { RegistryService } from '../../service/registry.service';

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
export abstract class BaseComponent implements OnInit, OnDestroy{
  protected _object: Container | undefined;
  protected _subscriptions: Subscription[] = [];
  
  constructor(
    protected registry: RegistryService,
    public el: ElementRef
  ) { } 

  abstract get object(): Container | undefined;

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
