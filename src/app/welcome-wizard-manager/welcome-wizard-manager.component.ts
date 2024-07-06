import { AfterViewInit, Component, Inject, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { ModalService } from '../../service/modal.service';
import { environment } from '../../environments/environment';

import { StorageServiceAbstract } from '../../types/storage';

@Component({
  selector: 'welcome-wizard-manager',
  templateUrl: './welcome-wizard-manager.component.html',
  styleUrls: ['./welcome-wizard-manager.component.scss']
})
export class WelcomeWizardManagerComponent implements AfterViewInit {
  @ViewChildren(TemplateRef) steps: QueryList<TemplateRef<any>> | null = null;
  selectedStepIndex = 0;
  version = environment.version
  document: any;
  isElectron = window.electron !== undefined;

  constructor(
    private modalService: ModalService,
    @Inject('StorageServiceAbstract') private storageService: StorageServiceAbstract
  ) {
    this.document = document;
  }

  ngAfterViewInit(): void {
    console.log(this.steps);
    // wizard management: start the modal passing the first step as content
    if (this.steps?.first) {
      this.modalService.setModalContent(this.steps?.first);
      this.modalService.setDisplayModal(true);
    }
  }

  createNewStatusFile() {
    this.storageService.createStatusFile()
      .then(filePath => {
        console.log('Status file created at:', filePath);
        if(!filePath) throw("No file selected");
        //this.handleStatusFileChosen(filePath);
      })
      .catch(error => console.error('Error creating status file:', error));
  }

  async openStatusFile(event?: Event) {
    let path = await this.storageService.openAppStatus(event)
    if(!path) throw("No file selected");
    //this.handleStatusFileChosen(path);
  }

  nextStep() {
    this.selectedStepIndex++;
    if (!this.steps) return;
    this.modalService.setModalContent(this.steps?.toArray()[this.selectedStepIndex]);
  }

  closeModal() {
    this.modalService.setDisplayModal(false);
  }

}
