import { Injectable, NgZone } from '@angular/core';
import { StorageServiceAbstract } from '../types/storage';
import { Observable, Subject, Subscription } from 'rxjs';
import { getStatusPath, setStatusPath } from '../utils/utils';

@Injectable({
  providedIn: 'root',
})
export class ElectronService extends StorageServiceAbstract{
  storagePath: string | null = null;
  subscription: Subscription | undefined;
  status = '{}';
  private statusChangeOutsideApp: Subject<string | null> = new Subject<string | null>();

  constructor(
    protected override  zone: NgZone,
  ) {
    super();
    if(!window.electron) {
      console.log('Electron not available');
      return;
    }
    /**Electron callbacks */
    window.electron.onOpenedAppStatus(( event, filePath) => {
      console.log('Opened app status');
      const statusContent = this.initWithStoragePath(filePath);
      this.status = statusContent;
      this.statusChangeOutsideApp.next(statusContent);
    });
    window.electron.onStoreAppStatusRequest(() => {
      window.electron.sendAppStatus(this.status);
    });

    this.storagePath = getStatusPath();
    if(this.storagePath){
      this.initWithStoragePath(this.storagePath);
    }
  }
  override getStatus(): string | null {
    return this.status;
  }

  override isStatusPresent(): boolean {
    return this.storagePath !== undefined && this.storagePath !== null;
  }

  override writeToStatus(status: object): void {
    if(!this.storagePath) throw('No storage path configured');
    if( JSON.stringify(status) === this.status) return;
    this.writeSystemFile(this.storagePath, JSON.stringify(status));
  }

  override async openStatus(): Promise<string | undefined> {
    const { path, content } = await window.electron.openAppStatus();
    this.storagePath = path;
    this.status = content;
    setStatusPath(this.storagePath);
    this.statusChangeOutsideApp.next(content);
    return content;
  }

  override async createNewStatus(): Promise<boolean> {
    this.storagePath = await window.electron.createFile();
    this.initWithStoragePath(this.storagePath);
    return true;
  }

  private initWithStoragePath(storagePath: string): string {
    this.storagePath = storagePath;
    try{
      this.status = this.readSystemFile(this.storagePath);
      this.zone.run(() => {
        // Electron fix

        if(!this.storagePath) throw('No storage path');
        setStatusPath(this.storagePath);
      });
      return this.status;
    }catch(e){
      console.error(e);
      throw('It was not possible to deserialize the status in ' + this.storagePath);
    }
  }

  private readSystemFile(filePath: string): string {
    if (window.electron) {
      try{
        return window.electron.readFile(filePath);
      }catch(e){
        console.warn('Error reading file', e);
        return '{}';
      }
    } else {
      throw new Error('Electron not available');
    }
  }

  private writeSystemFile(filePath: string, content: string): void {
    this.status = content;
    window.electron.writeFile(filePath, content);
  }

  override getStatusChangeOutsideAppObservable(): Observable<string | null> {
    return this.statusChangeOutsideApp.asObservable();
  }
}
