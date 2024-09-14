import{ Component, Input }from'@angular/core';
import{ DateDisplayConfig, Container, Status }from'../../types/types';
import{ formatDate }from'../../utils/date-utils';
import{ statusValues }from'../../types/constants';

@Component( {
  selector: 'time-bar[container][boardDatesConfig]',
  templateUrl: './time-bar.component.html',
  styleUrl: './time-bar.component.scss',
} )
export class TimeBarComponent{
  @Input() container!: Container; ;
  @Input() boardDatesConfig!: DateDisplayConfig;

  getTooltip( dateKey: Status ):string{
    return`${dateKey}: ${this.getDays( dateKey )} days - from ${formatDate( this.container.dates[dateKey]?.enter, this.boardDatesConfig )} to ${formatDate( this.container.dates[dateKey]?.leave, this.boardDatesConfig )}`;
  }

  getDays( dateKey: Status ):number{
    const start = this.container.dates[dateKey]?.enter;
    const end = this.container.dates[dateKey]?.leave;
    if( !start ||!end ){
      return 0;
    }
    const days = ( new Date( end ).getTime() - new Date( start ).getTime() ) / ( 1000 * 60 * 60 * 24 );
    return Math.round( days * 100 ) / 100;
  }

  getWidth( dateKey: Status ):string{
    const totalDays = Object.keys( this.container.dates ).reduce( ( sum, date ) => sum + this.getDays( date as Status ), 0 );

    return( Math.min( this.getDays( dateKey ) / totalDays, 1 ) * 100 ) + '%';
  }

  getDates(): Status[]{
    const ret: Status[] = [];
    for( const key of Object.keys( this.container.dates ) ){
      const status = key as Status;
      if( this.container.dates &&
        this.container.dates[status] &&
        this.container.dates[status]?.enter &&
        this.container.dates[status]?.leave ){
        ret.push( status );
      }
    }
    return ret.sort( ( a,b ) => Object.keys( statusValues ).indexOf( a ) - Object.keys( statusValues ).indexOf( b ) );
  }
}
