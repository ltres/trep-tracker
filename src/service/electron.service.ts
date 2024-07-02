import { Injectable } from '@angular/core';
import { BoardService } from './board.service';
import { StorageService } from './storage.service';

// @ts-ignore
@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  constructor(
    private storageService: StorageService,
    private boardService: BoardService
  ) {
    window.electron.onOpenedAppStatus(( event, filePath) => {
      console.log("Opened app status");
      this.storageService.initWithStoragePath(filePath);
    })
    window.electron.onStoreAppStatusRequest(() => {
      window.electron.sendAppStatus(this.boardService.serialize());
    })
  }

  openAppStatus(): Promise<string | undefined> {
    return window.electron.openAppStatus();
  }

  createStatusFile(): Promise<string | undefined> {
    return window.electron.createFile();
  }

  sendAppStatus( status: Object ): void {
    window.electron.sendAppStatus(status);
  }

}

