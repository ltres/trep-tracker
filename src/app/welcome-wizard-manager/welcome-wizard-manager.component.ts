import { NgClass } from '@angular/common';
import { AfterViewInit, Component, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { View } from 'electron';
import { ModalService } from '../../service/modal.service';
import { environment } from '../../environments/environment';
import { StorageService } from '../../service/storage.service';
import { setStatusPath } from '../../utils/utils';
import { ElectronService } from '../../service/electron.service';

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

  constructor(
    private modalService: ModalService,
    private storageService: StorageService,
    private electronService: ElectronService
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
    this.electronService.createStatusFile()
      .then(filePath => {     
        console.log('Status file created at:', filePath);
        this.handleStatusFileChosen(filePath);
      })
      .catch(error => console.error('Error creating status file:', error));
  }

  handleStatusFileChosen($event: Event | string) {
    let filePath: string | undefined = "";
    if(typeof $event === 'string'){
      filePath = $event;
    }else{
      const fileInput = $event.target as HTMLInputElement;
      const file = fileInput.files?.[0];
      filePath = file?.path;
    }

    if(filePath){
      try{
        this.storageService.initWithStoragePath(filePath);
        setStatusPath(filePath);
        this.nextStep();
      }catch(e){
        alert(e);
      }
    }

  }
  nextStep() {
    this.selectedStepIndex++;
    if(!this.steps) return;
    this.modalService.setModalContent(this.steps?.toArray()[this.selectedStepIndex]);
  }

  closeModal() {
    this.modalService.setDisplayModal(false);
  }

}
