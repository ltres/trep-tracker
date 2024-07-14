import { AfterViewInit, Component, Inject, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { ModalService } from '../../service/modal.service';
import { environment } from '../../environments/environment';

import { StorageServiceAbstract } from '../../types/storage';
import { BoardService } from '../../service/board.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'welcome-wizard-manager',
  templateUrl: './welcome-wizard-manager.component.html',
  styleUrls: ['./welcome-wizard-manager.component.scss']
})
export class WelcomeWizardManagerComponent implements AfterViewInit {
  @ViewChildren(TemplateRef) steps: QueryList<TemplateRef<any>> | null = null;
  selectedStepIndex = 0;
  version = document.querySelector('body')?.getAttribute('data-version') || 'vUnknown';
  document: any;
  isElectron = window.electron !== undefined;

  constructor(
    private modalService: ModalService,
    private boardService: BoardService,
    private http: HttpClient,
    @Inject('StorageServiceAbstract') private storageService: StorageServiceAbstract
  ) {
    this.document = document;
  }

  ngAfterViewInit(): void {
    // wizard management: start the modal passing the first step as content
    if (this.steps?.first) {
      this.modalService.setModalContent(this.steps?.first);
      this.modalService.setDisplayModal(true);
    }
  }

  createNewStatusFile() {
    this.storageService.createNewStatus()
      .then(filePath => {
        console.log('Status file created');
        if(!filePath) throw("No file selected");
        this.closeModal();
      })
      .catch(error => console.error('Error creating status file:', error));
  }

  async openStatusFile(event?: Event) {
    let fileContent = await this.storageService.openStatus(event);
    if(!fileContent) throw("No file selected");
    this.boardService.deserialize(fileContent);
    this.closeModal();
  }

  nextStep() {
    this.selectedStepIndex++;
    if (!this.steps) return;
    this.modalService.setModalContent(this.steps?.toArray()[this.selectedStepIndex]);
  }

  closeModal() {
    this.modalService.setDisplayModal(false);
  }

  setupDemoBoard() {
    this.http.get("/assets/readme/github-pages-example-status.trptrk", {responseType: 'text'})
    .subscribe(
      data => {
        this.storageService.openStatus(data);
        this.closeModal();
      }
    );
  }

}
