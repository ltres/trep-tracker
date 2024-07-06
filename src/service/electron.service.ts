import { Injectable, Injector, NgZone } from '@angular/core';
import { BoardService } from './board.service';
import { StorageService } from './storage.service';
import { StorageServiceAbstract } from '../types/storage';
import { Subscription } from 'rxjs';
import { getStatusPath, setStatusPath } from '../utils/utils';

// @ts-ignore
@Injectable({
  providedIn: 'root'
})
export class ElectronService extends StorageServiceAbstract{
  storagePath: string | undefined;
  initializedWithValidStatus = false;
  subscription: Subscription | undefined;

  constructor(
    private boardService: BoardService,

    private zone: NgZone
  ) {
    super();

    if(!window.electron) {
      console.log("Electron not available");
      return;
    }
    window.electron.onOpenedAppStatus(( event, filePath) => {
      console.log("Opened app status");
      this.initWithStoragePath(filePath);
    })
    window.electron.onStoreAppStatusRequest(() => {
      window.electron.sendAppStatus(this.boardService.serialize());
    })
  }
  isStatusPresent(): boolean {
    return this.storagePath !== undefined;
  }
  init() {
    let path = getStatusPath();
    if(path){
      this.initWithStoragePath(path);
    }else{
      
    }
  }

  private initWithStoragePath(storagePath: string): void {
    this.storagePath = storagePath;
    try{
      let file = this.readFile(this.storagePath);

      this.zone.run(() => {
        // Electron fix
        this.boardService.deserialize(file);
        this.boardService.selectFirstBoard();
        if(!this.storagePath) throw("No storage path");
        setStatusPath(this.storagePath);
      })

    }catch(e){
      throw("It was not possible to deserialize the status in " + this.storagePath);
    }
    if(this.subscription) this.subscription.unsubscribe();
    this.subscription = this.boardService.boards$.subscribe(boards => {
      this.writeFile(this.storagePath!, this.boardService.serialize());
    });
  }

  private readFile(filePath: string): string {
    if (window.electron) {
      try{
        return window.electron.readFile(filePath);
      }catch(e){
        console.warn("Error reading file", e);
        return "{}";
      }
    } else {
      return JSON.parse(localStorage.getItem("trep-tracker-status") ?? "{}");
    }
  }

  private writeFile(filePath: string, content: string): void {
    window.electron.writeFile(filePath, content);
  }

  writeToStatusFile(status: string): void {
    this.writeFile(this.storagePath!, status);
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

