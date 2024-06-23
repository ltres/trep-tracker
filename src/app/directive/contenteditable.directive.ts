import {
    Directive, ElementRef, Input, Output, EventEmitter, SimpleChanges, OnChanges,
    HostListener, Sanitizer, SecurityContext
} from '@angular/core';
import { getCaretPosition, setCaretPosition } from '../../utils/utils';
import { Container } from '../../types/task';
import { TagService } from '../../service/tag.service';

@Directive({
    selector: '[contenteditableModel][container]'
})
export class ContenteditableDirective implements OnChanges {
    @Input() contenteditableModel: string = "";
    @Input() container!: Container;
    @Output() contenteditableModelChange = new EventEmitter();

    private shouldRefresh = false;
    private timeout: NodeJS.Timeout | undefined = undefined;

    /** Allow (sanitized) html */
    @Input() contenteditableHtml?: boolean = false;

    constructor(
        private tagService: TagService,
        private elRef: ElementRef,
    ) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['contenteditableModel']) {
            // On init: if contenteditableModel is empty, read from DOM in case the element has content
            if (changes['contenteditableModel'].isFirstChange() && !this.contenteditableModel) {
                this.onInput(true);
            }
            this.refreshView();
        }
    }

    @HostListener('input') // input event would be sufficient, but isn't supported by IE
    @HostListener('blur')  // additional fallback
    @HostListener('keyup') 
    onInput(trim = false) {
        let value = this.elRef.nativeElement[this.getProperty()];

        this.container.textContent = value;
        this.tagService.extractAndUpdateTags(this.container);
        value = this.container.textContent;

        //this.contenteditableModelChange.emit(value);
        this.shouldRefresh = true;
        this.delayedEmitChanges(value);
    }

    @HostListener('blur')  // additional fallback
    onBlurred() {
        let value = this.elRef.nativeElement[this.getProperty()];
        this.delayedEmitChanges(value);
    }

    @HostListener('paste') onPaste() {
        this.onInput();
        if (!this.contenteditableHtml) {
            // For text-only contenteditable, remove pasted HTML.
            // 1 tick wait is required for DOM update
            setTimeout(() => {
                if (this.elRef.nativeElement.innerHTML !== this.elRef.nativeElement.innerText) {
                    this.elRef.nativeElement.innerHTML = this.elRef.nativeElement.innerText;
                }
            });
        }
    }

    private delayedEmitChanges(value: string){
        if( this.timeout ){ 
            clearTimeout(this.timeout)
        };
        this.timeout = setTimeout(() => {
            if( this.shouldRefresh ){
                this.contenteditableModelChange.emit( value );
                this.shouldRefresh = false;
            }
        }, 500);
    }

    private refreshView() {
        const newContent = this.sanitize(this.contenteditableModel);
        // Only refresh if content changed to avoid cursor loss
        // (as ngOnChanges can be triggered an additional time by onInput())
        if (newContent !== this.elRef.nativeElement[this.getProperty()]) {
            let pos = 0
            if( document.activeElement === this.elRef.nativeElement ){
                // avoids moving the cursor to copies of the same element
                pos = getCaretPosition(this.elRef.nativeElement);
            }
            this.elRef.nativeElement[this.getProperty()] = newContent;
            if( document.activeElement === this.elRef.nativeElement ){
                setCaretPosition(this.elRef.nativeElement, pos);
            }
        }
    }

    private getProperty(): string {
        return this.contenteditableHtml ? 'innerHTML' : 'innerText';
    }

    private sanitize(content: string): string {
        //return this.contenteditableHtml ? this.sanitizer.sanitize(SecurityContext.HTML, content) ?? "" : content;
        return content;
    }
}
