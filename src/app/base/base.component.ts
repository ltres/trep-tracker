import{ AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, ElementRef, OnChanges, OnDestroy, OnInit, SimpleChanges }from'@angular/core';
import{ Subscription }from'rxjs';
import{ Container }from'../../types/types';
import{ ContainerComponentRegistryService }from'../../service/registry.service';
import{ ChangePublisherService }from'../../service/change-publisher.service';

// A base compoent whose data model is a Container
// This component is responsible for managing subscriptions and unsubscribing them
// Also subscribes and unsubscribes from component registry.
@Component( {
  selector: 'app-base',
  //standalone: true,
  //imports: [],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,

} )
export abstract class ContainerComponent implements OnInit, OnDestroy, AfterViewInit, DoCheck, OnChanges{
  protected _container!: Container;
  protected _subscriptions: Subscription[] = [];

  constructor(
    protected changePublisherService: ChangePublisherService,
    protected cdr: ChangeDetectorRef,
    protected registry: ContainerComponentRegistryService,
    public el: ElementRef<HTMLElement>,

  ){ 
    this.subscriptions = this.changePublisherService.pushedChanges$.subscribe( c => {
      if( c.find( cont => cont.id === this.container.id ) ){
        console.info( `Detected change for ${this.container._type} ${this.container.id}` )
        cdr.detectChanges();
      }
    } )
  }
  ngOnChanges( changes: SimpleChanges ): void{
    console.info( `Component has detected changes on ${this.container._type} ${this.container.id}`, changes )
  }
  ngDoCheck(): void{
    // console.info( `Component is checking for changes on ${this.container._type} ${this.container.id}` )
  }

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
