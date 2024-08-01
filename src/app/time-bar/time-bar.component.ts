import { Component, Input } from '@angular/core';
import { Container, Status, Statuses } from '../../types/types';
import { formatDate } from '../../utils/utils';

@Component({
  selector: 'time-bar[container]',
  templateUrl: './time-bar.component.html',
  styleUrl: './time-bar.component.scss',
})
export class TimeBarComponent {
  @Input() container!: Container; ;

  getTooltip(dateKey: Status):string {
    return `${dateKey}: ${this.getDays(dateKey)} days - from ${formatDate(this.container.dates[dateKey]?.enter)} to ${formatDate(this.container.dates[dateKey]?.leave)}`;
  }

  getDays(dateKey: Status):number {
    const start = this.container.dates[dateKey]?.enter;
    const end = this.container.dates[dateKey]?.leave;
    if(!start ||!end){
      return 0;
    }
    const days = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
    return Math.round(days * 100) / 100;
  }

  getWidth(dateKey: Status):string {
    const totalDays = Object.keys(this.container.dates).reduce( (sum, date) => sum + this.getDays(date as Status), 0 );

    return (Math.min( this.getDays(dateKey) / totalDays, 1) * 100) + '%';
  }

  getDates(): Status[] {
    const ret: Status[] = [];
    for( const key of Object.keys(this.container.dates) ) {
      const status = key as Status;
      if( this.container.dates &&
        this.container.dates[status] &&
        this.container.dates[status]?.enter &&
        this.container.dates[status]?.leave) {
        ret.push(status);
      }
    }
    return ret.sort( (a,b) => Object.keys(Statuses).indexOf(a) - Object.keys(Statuses).indexOf(b) );
  }
}
