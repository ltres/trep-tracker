import { Injectable, Injector, NgZone } from "@angular/core";
import { ipcRenderer } from 'electron';
import { BoardService } from "./board.service";
import { Subscription } from "rxjs";
import { environment } from "../environments/environment";
import { getStatusPath, setStatusPath } from "../utils/utils";
import { StorageServiceAbstract } from "../types/storage";


@Injectable({
  providedIn: 'root'
})
export class StorageService extends StorageServiceAbstract {
  storagePath: string | undefined;
  statusOpened = false;
  subscription: Subscription | undefined;
  constructor(
    private boardService: BoardService,
    private zone: NgZone
  ) { 
    super();
   }
  isStatusPresent(): boolean {
    return this.statusOpened;
  }

  init() {
    console.warn('Nothing to init in non-electron context'); 
  }

  openAppStatus(fileEvent?: Event): Promise<string | undefined> {
    if (!fileEvent || fileEvent === null) throw ("No file selected");
    let target = fileEvent.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) throw ("No file selected");
    const file = target.files[0]; // Get the first file

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload =  (loadEvent) => {
        const fileContent = loadEvent.target!.result;
        this.boardService.deserialize(fileContent as string);
        this.boardService.selectFirstBoard();
        resolve(fileContent as string);
        this.statusOpened = true;
      };

      reader.onerror = function () {
        console.error("Could not read the file");
      };

      reader.readAsText(file);
    });

  }
  createStatusFile(): Promise<string | undefined> {
    throw new Error("Cannot createStatusFile in non-electron environment");
  }
  writeToStatusFile(status: Object): void {
    throw new Error("Cannot saveToStatus in non-electron environment");
  }

}

