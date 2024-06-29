import {
    Directive, ElementRef, Input, Output, EventEmitter, SimpleChanges, OnChanges,
    HostListener, Sanitizer, SecurityContext,
    forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgModel } from '@angular/forms';
import { generateUUID, getCaretCharacterOffsetWithin, getCaretPosition, setCaretPosition } from '../../utils/utils';
import { TagService } from '../../service/tag.service';
import { Container, Tag } from '../../types/task';

@Directive({
    selector: '[contenteditable][ngModel]',
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => ContenteditableDirective),
        multi: true
    }]
})
export class ContenteditableDirective implements ControlValueAccessor, OnChanges {
    @Input() ngModel!: string;
    @Input() preventEvents: boolean = false;
    @Output() ngModelChange = new EventEmitter<string>();
    @Output() onTagsChange = new EventEmitter<Tag[]>();

    private caretShift: number = 0;

    constructor(
        private tagService: TagService,
        private elementRef: ElementRef
    ) { }


    @HostListener('keyup')
    //@HostListener('blur')
    onInteract(): void {
        // get the current cursor position:
        //const value = this.elementRef.nativeElement.innerHTML;
        const value =  this.elementRef.nativeElement.textContent;
        let result = this.tagService.extractTags( value );
        //console.log(result);
        if(!this.preventEvents){
            this.onTagsChange.emit(result.tags);
        }
        this.caretShift = result.caretShift;
        //this.ngModel = value;
        //this.onChange(value); // makes the ngModel effectively update by calling the writeValue
        //this.onTouched();
        //this.skipWriteValue = true;
        if(!this.preventEvents){
            this.ngModelChange.emit(result.taggedString); // makes the ngModel effectively update. Triggers ngOnChange
        }
        //this.elementRef.nativeElement.innerHTML = value;
    }

    private onChange: (value: string) => void = () => {};
    private onTouched: () => void = () => {};

    ngOnChanges(changes: SimpleChanges): void {
        //this.startingCaretPosition = getCaretPosition( this.elementRef.nativeElement );
        
        if( !changes['ngModel'] || this.elementRef.nativeElement.innerHTML === changes['ngModel'].currentValue || changes['ngModel'].isFirstChange() ){
            return;
        }
        console.log("model changed", changes)
        /*
        this.elementRef.nativeElement.innerHTML = changes['ngModel'].currentValue;
        setTimeout( () => {
            setCaretPosition(this.elementRef.nativeElement, this.startingCaretPosition!);

        }) */
    }

    // This method is called by the forms API to write to the view when programmatic changes from model to view are requested.
    // gets called when new tag html should be inserted in the DOM
    writeValue(value: string | null): void {
        if(!value) return;
        let curVal = this.elementRef.nativeElement.innerHTML.replaceAll("&nbsp;"," ").replace(/\s/," ")
        value = value.replaceAll("&nbsp;"," ").replace(/\s/," ");

        if( curVal !== value ){
            let pos = getCaretCharacterOffsetWithin(this.elementRef.nativeElement);
            this.elementRef.nativeElement.innerHTML = value || '';
            if(!this.preventEvents){
                setCaretPosition(this.elementRef.nativeElement, pos + this.caretShift);
                this.caretShift = 0;
            }
            console.log("write value", value)
        }
        
        //this.skipWriteValue = true
        //this.ngModel = value;
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.elementRef.nativeElement.contentEditable = !isDisabled;
    }

    /*
    ngOnChanges(changes: SimpleChanges) {
        console.log("changes")
        /*
        if (changes['contenteditableModel']) {
            // On init: if contenteditableModel is empty, read from DOM in case the element has content
            if (changes['contenteditableModel'].isFirstChange() && !this.contenteditableModel) {
                this.onInput(true);
            }
            this.refreshView();
        }*
    } */

    /*
    @HostListener('input') // input event would be sufficient, but isn't supported by IE
    @HostListener('blur')  // additional fallback
    @HostListener('keyup') 
    onInput(trim = false) {
        console.log("input")
        
        let value = (this.elRef.nativeElement as HTMLElement).innerHTML;

        this.container.textContent = value;
        let moveCaretForward = this.tagService.extractAndUpdateTags(this.container);
        value = this.container.textContent;

        //this.contenteditableModelChange.emit(value);
        //this.shouldRefresh = true;
        if(moveCaretForward){
            setCaretPosition( this.elRef.nativeElement, this.elRef.nativeElement.textContent.length + moveCaretForward );
        }
        // moveCaret(moveCaretForward);
        //this.delayedEmitChanges(value ,moveCaretForward);
        
    }

    @HostListener('blur')  // additional fallback
    onBlurred() {
        /*
        let value = this.elRef.nativeElement[this.getProperty()];
        this.delayedEmitChanges(value);
        
    }*/

    /*
    @HostListener('paste') onPaste() {
        this.onInput();
    }

    private delayedEmitChanges(value: string, moveRight: number = 0){
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
    */
    /*
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
    */

}


