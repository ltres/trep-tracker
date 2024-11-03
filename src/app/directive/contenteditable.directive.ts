import{
  Directive, ElementRef, Input, Output, EventEmitter, 
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

    private start = 0;

    constructor(
        private tagService: TagService,
        private elementRef: ElementRef,
    ){ }
    
    @HostListener( 'keyup', ['$event'] )
    onInteract( $event:KeyboardEvent ): void{
      if( ( $event.shiftKey || $event.ctrlKey ) && ( $event.key === 'ArrowDown' || $event.key === 'ArrowUp' ) ){
        // Task is being selected or moved
        return;
      }
      // get the current cursor position:
      const value =  this.elementRef.nativeElement.textContent;
      const result = this.tagService.extractTags( value, this.board );
      
      this.caretShift = result.caretShift;

      if( !this.preventEvents ){
        this.onTagsChange.emit( result.tags );
      }
      if( !this.preventEvents ){
        this.ngModelChange.emit( result.taggedString ); // makes the ngModel effectively update. Triggers ngOnChange
      }
    }

    private onChange: ( value: string ) => void = () => {};
    private onTouched: () => void = () => {};
    /*
    ngOnChanges( changes: SimpleChanges ): void{
    //this.startingCaretPosition = getCaretPosition( this.elementRef.nativeElement );

      if( !changes['ngModel'] || this.elementRef.nativeElement.innerHTML === changes['ngModel'].currentValue || changes['ngModel'].isFirstChange() ){
        return;
      }
    }
    */
    // This method is called by the forms API to write to the view when programmatic changes from model to view are requested.
    // gets called when new tag html should be inserted in the DOM
    writeValue( value: string | null ): void{
      if( !value )return;
      const curVal = this.elementRef.nativeElement.innerHTML.replaceAll( '&nbsp;', ' ' ).replace( /\s/, ' ' );
      value = value.replaceAll( '&nbsp;', ' ' ).replace( /\s/, ' ' );

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
}
