import { Injectable, TemplateRef } from "@angular/core";
import { Board, Lane, Container, Task, Tag, tagIdentifiers, tagHtmlWrapper, tagCapturingGroup, DoneTag, ArchivedTag, addTagsForDoneAndArchived } from "../types/task";
import { BehaviorSubject, Observable, filter, map } from "rxjs";
import { generateUUID } from "../utils/utils";
import { BoardService } from "./board.service";

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    private _displayModal$ = new BehaviorSubject<boolean>(false);
    private _modalContent$ = new BehaviorSubject<TemplateRef<any> | null>(null);

    get displayModal$(): Observable<boolean> {
        return this._displayModal$;
    }
    get modalContent$(): Observable<TemplateRef<any> | null> {
        return this._modalContent$;
    }

    setDisplayModal(displayModal: boolean): void {
        this._displayModal$.next(displayModal);
    }

    setModalContent(modalContent: TemplateRef<any> | null): void {
        this._modalContent$.next(modalContent);
    }
}
