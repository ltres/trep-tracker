import { Injectable, Injector, NgZone } from '@angular/core';
import { BoardService } from './board.service';
import { LocalFileStorageService } from './local-file-storage.service';
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
    /**Electron callbacks */
    window.electron.onOpenedAppStatus(( event, filePath) => {
      console.log("Opened app status");
      this.initWithStoragePath(filePath);
    })
    window.electron.onStoreAppStatusRequest(() => {
      window.electron.sendAppStatus(this.boardService.serialize());
    })

    if(this.storagePath){
      this.initWithStoragePath(this.storagePath);
    }
  }
  isStatusLocationConfigured(): boolean {
    return this.storagePath !== undefined;
  }
  override getStatusLocation(): string | undefined {
    return this.storagePath;
  }
  override writeToStatus(status: string): void {
    this.writeSystemFile(this.storagePath!, status);
  }

  override openStatus(): Promise<string | undefined> {
    return window.electron.openAppStatus();
  }

  override createNewStatus(): Promise<string | undefined> {
    return window.electron.createFile();
  }

  private initWithStoragePath(storagePath: string): void {
    this.storagePath = storagePath;
    try{
      let file = this.readSystemFile(this.storagePath);

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
      this.writeSystemFile(this.storagePath!, this.boardService.serialize());
    });
  }

  private readSystemFile(filePath: string): string {
    if (window.electron) {
      try{
        return window.electron.readFile(filePath);
      }catch(e){
        console.warn("Error reading file", e);
        return "{}";
      }
    } else {
      throw new Error("Electron not available");
    }
  }

  private writeSystemFile(filePath: string, content: string): void {
    window.electron.writeFile(filePath, content);
  }



}

