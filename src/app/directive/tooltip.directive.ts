import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[tooltip]',
})
export class TooltipDirective {
  @Input('tooltip') tooltip: string = '';

  @Input('position') position: "top" | "bottom" | "left" | "right" | undefined = "top";

  body = document.querySelector('body')!
  el: HTMLDivElement | undefined;

  constructor(
    private element: ElementRef,
  ) { }

  @HostListener('mouseenter', ['$event'])
  onMouseEnter( ) {
    this.element.nativeElement.style.position = 'relative';
    const tooltip = document.createElement('div');
    tooltip.classList.add('tooltip');
    tooltip.classList.add('standard');
    tooltip.innerHTML = this.tooltip;
    tooltip.style.position = 'absolute';
    tooltip.style.whiteSpace = 'nowrap';
    this.body.appendChild(tooltip);

    const bbox = (this.element.nativeElement as HTMLElement).getBoundingClientRect()
    switch(this.position){
      case "top":
        tooltip.style.top = `${bbox.top - tooltip.getBoundingClientRect().height}px`;
        tooltip.style.left = `${bbox.left}px`;
        break;
      case "bottom" :
        tooltip.style.top = `${bbox.top + tooltip.getBoundingClientRect().height}px`;
        tooltip.style.left = `${bbox.left}px`;
        break;
      case "left":
        tooltip.style.top = `${bbox.top}px`;
        tooltip.style.right = `${bbox.left}px`;
        break;
      case "right" :
        tooltip.style.top = `${bbox.top}px`;
        tooltip.style.left = `${bbox.right}px`;
        break;
          
    }

    tooltip.style.backgroundColor = 'black';
    tooltip.style.color = 'white';
    //tooltip.style.padding = '5px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.zIndex = '1000';
    this.el = tooltip

  }
  @HostListener('mouseleave')
  onMouseLeave() {

    this.element.nativeElement.style.position = 'unset';
    this.element.nativeElement.style.overflowX = '';

    this.el?.remove();
    document.querySelectorAll('.tooltip').forEach( n => n.remove())
  }

}
