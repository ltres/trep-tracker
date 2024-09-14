import{ Component, Input }from'@angular/core';

@Component( {
  selector: 'logo',
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
} )
export class LogoComponent{
  @Input() size: number = 4;
}
