import { Injectable, TemplateRef } from "@angular/core";
import { Board, Lane, Container, Task, Tag, tagIdentifiers, tagHtmlWrapper, tagCapturingGroup,  addTagsForDoneAndArchived } from "../types/task";
import { BehaviorSubject, Observable, filter, map } from "rxjs";
import { generateUUID } from "../utils/utils";
import { BoardService } from "./board.service";

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    private _displayModal$ = new BehaviorSubject<{show: boolean, size: ModalSize}>({show:false, size: 'standard'});
    private _modalContent$ = new BehaviorSubject<TemplateRef<any> | null>(null);

    get displayModal$(): Observable<{show: boolean, size: ModalSize}> {
        return this._displayModal$;
    }
    get modalContent$(): Observable<TemplateRef<any> | null> {
        return this._modalContent$;
    }

    setDisplayModal(displayModal: boolean, modalSize?: ModalSize ): void {
        this._displayModal$.next({show:displayModal, size: modalSize || 'standard'});
    }

    setModalContent(modalContent: TemplateRef<any> | null): void {
        this._modalContent$.next(modalContent);
    }
}

export type ModalSize = 'standard' | 'full';