import{ Component, ElementRef, EventEmitter, Input, Output }from'@angular/core';
import{ Lane }from'../../types/types';
import{ ClickService }from'../../service/click.service';

@Component( {
  selector: 'lane-menu[lane]',
  templateUrl: './lane-menu.component.html',
  styleUrl: './lane-menu.component.scss',
} )
export class LaneMenuComponent{
  @Input() lane!: Lane;
  @Output() onClose = new EventEmitter<void>();

  constructor(
    private clickService: ClickService,
    private eRef: ElementRef ){
    this.clickService.click$.subscribe( ( target ) => {
      if( !this.eRef.nativeElement.contains( target ) ){
        this.onClose.emit();
      }
    } );
  }

}
