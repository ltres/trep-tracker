import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private _displayModal$ = new BehaviorSubject<{show: boolean, size: ModalSize}>({ show: false, size: 'standard' });
  private _modalContent$ = new BehaviorSubject<TemplateRef<unknown> | null>(null);

  get displayModal$(): Observable<{show: boolean, size: ModalSize}> {
    return this._displayModal$;
  }
  get modalContent$(): Observable<TemplateRef<unknown> | null> {
    return this._modalContent$;
  }

  setDisplayModal(displayModal: boolean, modalSize?: ModalSize ): void {
    this._displayModal$.next({ show: displayModal, size: modalSize || 'standard' });
  }

  setModalContent(modalContent: TemplateRef<unknown> | null): void {
    this._modalContent$.next(modalContent);
  }
  
}

export type ModalSize = 'standard' | 'full';
