import { Component, HostListener } from '@angular/core';
import { KeyboardService } from '../../service/keyboard.service';

@Component({
  selector: 'keyboard-listener',
  standalone: true,
  imports: [],
  templateUrl: './keyboard-listener.component.html',
  styleUrl: './keyboard-listener.component.scss',
  host: {
    '(document:keydown)': 'handleKeyboardEvent($event)'
  }
})
export class KeyboardListenerComponent {
  constructor(private keyboardService: KeyboardService) { }
  event: KeyboardEvent | undefined;

  @HostListener('document:keydown', ['$event'])
  @HostListener('document:keyup', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.event = event;
    this.keyboardService.publishKeyboardEvent(event);
  }

}
