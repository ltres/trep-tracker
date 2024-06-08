import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-base',
  //standalone: true,
  //imports: [],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss'
})
export class BaseComponent implements OnDestroy{
  protected _subscriptions: Subscription[] = [];


  set subscriptions(subscriptions: Subscription) {
    this._subscriptions.push(subscriptions);
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
