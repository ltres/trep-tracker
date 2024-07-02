import { Component } from '@angular/core';
import { ModalService } from '../../service/modal.service';

@Component({
  selector: 'modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  constructor(protected modalService: ModalService) { }
  closeModal() {
    this.modalService.setDisplayModal(false);
  }

}
