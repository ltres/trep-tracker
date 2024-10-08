import{
  Directive, ElementRef, Input, Output, EventEmitter, SimpleChanges, 
  HostListener, 
  forwardRef,
}from'@angular/core';
import{ ControlValueAccessor, NG_VALUE_ACCESSOR }from'@angular/forms';
import{ getCaretCharacterOffsetWithin, setCaretPosition }from'../../utils/utils';
import{ TagService }from'../../service/tag.service';
import{ Board, Tag }from'../../types/types';

@Directive( {
  selector: '[contenteditable][ngModel][board]',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef( () => ContenteditableDirective ),
    multi: true,
  }],
} )
export class ContenteditableDirective implements ControlValueAccessor{
    @Input() ngModel!: string;
    @Input() preventEvents: boolean = false;
    @Input() board!: Board;

    @Output() ngModelChange = new EventEmitter<string>();
    @Output() onTagsChange = new EventEmitter<Tag[]>();

    private caretShift: number = 0;
    private debounce: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private tagService: TagService,
        private elementRef: ElementRef,
    ){ }

    @HostListener( 'keyup', ['$event'] )
    // @HostListener('blur', ['$event'])
    onInteract( $event:KeyboardEvent ): void{
      if( ( $event.shiftKey || $event.ctrlKey ) && ( $event.key === 'ArrowDown' || $event.key === 'ArrowUp' ) ){
        // Task is being selected or moved
        return;
      }
      // get the current cursor position:
      const value =  this.elementRef.nativeElement.textContent;
      const result = this.tagService.extractTags( value, this.board );
      
      this.caretShift = result.caretShift;

      // Find similarities between other editables:
      //if( isTask( this.container ) ){
      //this.tagService.evaluateSimilarTasks( this.container, value, this.board )
      //}

      if( !this.preventEvents ){
        this.onTagsChange.emit( result.tags );
      }
      if( !this.preventEvents ){
        this.ngModelChange.emit( result.taggedString ); // makes the ngModel effectively update. Triggers ngOnChange
      }
    }

    private onChange: ( value: string ) => void = () => {};
    private onTouched: () => void = () => {};

    ngOnChanges( changes: SimpleChanges ): void{
    //this.startingCaretPosition = getCaretPosition( this.elementRef.nativeElement );

      if( !changes['ngModel'] || this.elementRef.nativeElement.innerHTML === changes['ngModel'].currentValue || changes['ngModel'].isFirstChange() ){
        return;
      }
      // console.log("model changed", changes)
    /*
        this.elementRef.nativeElement.innerHTML = changes['ngModel'].currentValue;
        setTimeout( () => {
            setCaretPosition(this.elementRef.nativeElement, this.startingCaretPosition!);

        }) */
    }

    // This method is called by the forms API to write to the view when programmatic changes from model to view are requested.
    // gets called when new tag html should be inserted in the DOM
    writeValue( value: string | null ): void{
      if( !value )return;
      const curVal = this.elementRef.nativeElement.innerHTML.replaceAll( '&nbsp;',' ' ).replace( /\s/,' ' );
      value = value.replaceAll( '&nbsp;',' ' ).replace( /\s/,' ' );

      if( curVal !== value ){
        const pos = getCaretCharacterOffsetWithin( this.elementRef.nativeElement );
        this.elementRef.nativeElement.innerHTML = value || '';
        if( !this.preventEvents ){
          setCaretPosition( this.elementRef.nativeElement, pos + this.caretShift );
          this.caretShift = 0;
        }
      }

    //this.skipWriteValue = true
    //this.ngModel = value;
    }

    registerOnChange( fn: ( value: string ) => void ): void{
      this.onChange = fn;
    }

    registerOnTouched( fn: () => void ): void{
      this.onTouched = fn;
    }

    setDisabledState( isDisabled: boolean ): void{
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
