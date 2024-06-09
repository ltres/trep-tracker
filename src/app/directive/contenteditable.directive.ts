import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[contentEditableModel]'
})
export class ContentEditableModelDirective {
  @HostListener('input') onInput() {
    const value = this.elRef.nativeElement.innerText;
    this.control?.control?.setValue(value);
  }

  constructor(private elRef: ElementRef, private control: NgControl) { }
}