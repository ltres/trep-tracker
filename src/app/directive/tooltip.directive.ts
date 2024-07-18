import { Directive, ElementRef, Host, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[tooltip]',
})
export class TooltipDirective {
  @Input('tooltip') tooltip: string = '';

  @Input('position') position: string | undefined

  constructor(
    private element: ElementRef,
  ) { }

  @HostListener('mouseenter')
  onMouseEnter(  ) {
    this.element.nativeElement.style.position = 'relative';
    const tooltip = document.createElement('div');
    tooltip.classList.add('tooltip')
    tooltip.classList.add('standard');
    tooltip.innerHTML = this.tooltip;
    tooltip.style.position = 'absolute';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.bottom = this.position && this.position === 'bottom' ?'-150%': '150%';
    tooltip.style.left = '0';
    tooltip.style.backgroundColor = 'black';
    tooltip.style.color = 'white';
    //tooltip.style.padding = '5px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.zIndex = '1000';
    this.element.nativeElement.appendChild(tooltip);

  }
  @HostListener('mouseleave')
  onMouseLeave() {
    this.element.nativeElement.style.position = 'unset';
    this.element.nativeElement.style.overflowX = '';

    (this.element.nativeElement as HTMLElement).removeChild(this.element.nativeElement.querySelector('.tooltip'));

  }

}
