import{ AfterViewInit, Component, ElementRef, OnDestroy, OnInit }from'@angular/core';
import{ Subscription }from'rxjs';
import{ Container }from'../../types/types';
import{ ContainerComponentRegistryService }from'../../service/registry.service';

// A base compoent whose data model is a Container
// This component is responsible for managing subscriptions and unsubscribing them
// Also subscribes and unsubscribes from component registry.
@Component( {
  selector: 'app-base',
  //standalone: true,
  //imports: [],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
} )
export abstract class ContainerComponent implements OnInit, OnDestroy, AfterViewInit{
  protected _container!: Container;
  protected _subscriptions: Subscription[] = [];

  constructor(
    protected registry: ContainerComponentRegistryService,
    public el: ElementRef<HTMLElement>,
  ){ }

  abstract get container(): Container;

  set subscriptions( subscriptions: Subscription ){
    this._subscriptions.push( subscriptions );
  }

  ngOnInit(): void{
    this.registry.addToContainerComponentRegistry( this.container, this )
  }

  ngAfterViewInit(): void{
  }
  ngOnDestroy(): void{
    this.registry.removeFromContainerComponentRegistry( this.container, this );
    this._subscriptions.forEach( subscription => subscription.unsubscribe() );
  }
}
