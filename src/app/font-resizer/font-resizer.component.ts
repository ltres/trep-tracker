import { Component } from '@angular/core';

@Component({
  selector: 'font-resizer',

  templateUrl: './font-resizer.component.html',
  styleUrl: './font-resizer.component.scss'
})
export class FontResizerComponent {

  _fontSize: number = 0;
  get fontSize(): number {
    return Number(window.getComputedStyle(document.querySelector('html')!).fontSize.replace('px', ''));
  }

  setFontSize($event: number) {
    document.querySelector('html')!.style.fontSize = $event + 'px';
  }
}
