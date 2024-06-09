import { Injectable } from "@angular/core";

import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class KeyboardService {
  _keyboardEvent$: BehaviorSubject<KeyboardEvent | undefined> = new BehaviorSubject<KeyboardEvent | undefined>(undefined);

  publishKeyboardEvent(event: KeyboardEvent | undefined) {
    this._keyboardEvent$.next(event);
  }

  get keyboardEvent$(): Observable<KeyboardEvent | undefined> {
    return this._keyboardEvent$;
  }

}
