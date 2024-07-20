import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClickService {

  private _click$: BehaviorSubject<HTMLElement | undefined> = new BehaviorSubject<HTMLElement | undefined>(undefined);

  constructor() { }

  publishClick(target: HTMLElement) {
    this._click$.next(target);
  }
  get click$(): Observable<HTMLElement | undefined> {
    return this._click$;
  }
}
