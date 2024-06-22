import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Lane } from '../../types/task';

@Component({
  selector: 'lane-menu[lane]',
  templateUrl: './lane-menu.component.html',
  styleUrl: './lane-menu.component.scss'
})
export class LaneMenuComponent {
  @Input() lane!: Lane;
  @Output() onClose = new EventEmitter<void>();

  constructor(private eRef: ElementRef) {
    
  }

  @HostListener('document:click', ['$event'])
  clickout(event: { target: any; }) {
    if(this.eRef.nativeElement.contains(event.target)) {
      //this.text = "clicked inside";
    } else {
      this.onClose.emit();
    }
  }
}
