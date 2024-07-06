import { Component, Input } from '@angular/core';
import { ISODateString } from '../../types/task';

@Component({
  selector: 'time-bar[min][max][display]',
  templateUrl: './time-bar.component.html',
  styleUrl: './time-bar.component.scss'
})
export class TimeBarComponent {

  @Input() min!: ISODateString ;
  @Input() max!: ISODateString;
  @Input() display!: ISODateString;

  getBars(steps: number): string {
    let minDate = new Date(this.min);
    let maxDate = new Date(this.max);
    let displayDate = new Date(this.display);

    // date difference:
    let diff = maxDate.getTime() - minDate.getTime();
    // in days:
    let days = diff / (1000 * 3600 * 24) / steps;
    // in steps:
    let step = days / steps;

    let displayDiff = displayDate.getTime() - minDate.getTime();
    let displayStep = displayDiff / (1000 * 3600 * 24) / step;

    return displayStep + "";
  }

}
