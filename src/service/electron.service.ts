import { Injectable } from '@angular/core';

// @ts-ignore
@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private electron: typeof Electron | undefined;
  // @ts-ignore
  private fs: typeof fs | undefined;

  constructor() {

  }

  isElectron(): boolean {
    return true
  }

  createStatusFile(): Promise<string> {
    return window.electron.createFile();
  }
}

