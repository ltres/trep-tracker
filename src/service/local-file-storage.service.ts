import { Injectable, Injector, NgZone } from "@angular/core";
import { Observable, Subject, Subscription } from "rxjs";
import { StorageServiceAbstract } from "../types/storage";


@Injectable({
  providedIn: 'root'
})
export class LocalFileStorageService extends StorageServiceAbstract {
  status: string | null = null;
  private statusChangeOutsideApp: Subject<string | null> = new Subject<string | null>();

  constructor() {
    super();
    this.status = localStorage.getItem("TrepTrackerStatus");
  }
  override isStatusPresent(): boolean {
    return this.status !== null;
  }

  override getStatus(): string | null {
    return this.status;
  }

  override openStatus(event?: Event): Promise<string | undefined> {
    if (!event) {
      throw new Error("Event is required to open status file");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (loadEvent) => {
        const fileContent = loadEvent.target!.result;
        this.status = fileContent as string;
        resolve(fileContent as string);
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

  override async createNewStatus(): Promise<boolean> {
    localStorage.removeItem("TrepTrackerStatus");
    this.status = "{}";
    this.statusChangeOutsideApp.next(this.status);
    return true;
  }

  override writeToStatus(status: Object): void {
    localStorage.setItem("TrepTrackerStatus", JSON.stringify(status));
  }

  override getStatusChangeOutsideAppObservable(): Observable<string | null> {
    return this.statusChangeOutsideApp.asObservable();
  }
}

