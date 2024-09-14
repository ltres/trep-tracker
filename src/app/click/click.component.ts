import{ Component, HostListener }from'@angular/core';
import{ ClickService }from'../../service/click.service';

@Component( {
  selector: 'click',
  templateUrl: './click.component.html',
  styleUrl: './click.component.scss',
} )
export class ClickComponent{

  constructor(
    private clickService: ClickService,
  ){ }

  // Listen to document clicks and their target:
  @HostListener( 'document:click', ['$event'] )
  clickout( event: { target: HTMLElement } ){
    this.clickService.publishClick( event.target );
  }
}
