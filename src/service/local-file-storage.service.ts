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
export class LocalFileStorageService extends StorageServiceAbstract {
  storagePath: string | undefined;
  statusOpened = false;
  subscription: Subscription | undefined;
  constructor() {
    super();
  }
  override isStatusLocationConfigured(): boolean {
    return this.statusOpened;
  }

  override getStatusLocation(): string | undefined {
    return this.storagePath;
  }

  override openStatus(event?: Event): Promise<string | undefined> {
    if(!event){
      throw new Error("Event is required to open status file");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (loadEvent) => {
        const fileContent = loadEvent.target!.result;
        resolve(fileContent as string);
        this.statusOpened = true;
        this.storagePath = file.path ?? file.name;
      };

      reader.onerror = function () {
        console.error("Could not read the file");
      };
      let target = event.target as HTMLInputElement;
      if (!target?.files || target.files.length === 0) throw ("No file selected");
      const file = target.files[0]; // Get the first file

      reader.readAsText(file);
    });
  }

  override createNewStatus(): Promise<string | undefined> {
    throw new Error("Cannot createStatusFile in non-electron environment");
  }
  
  override writeToStatus(status: Object): void {
    throw new Error("Cannot saveToStatus in non-electron environment");
  }

}

