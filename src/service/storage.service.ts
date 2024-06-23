import { Injectable } from "@angular/core";
import { ipcRenderer } from 'electron';
import { BoardService } from "./board.service";
import { Subscription } from "rxjs";
import { environment } from "../environments/environment";


@Injectable({
  providedIn: 'root'
})
export class StorageService {
  storagePath = environment.statusUrl;
  initializedWithValidStatus = false;
  subscription: Subscription | undefined;
  constructor(private boardService: BoardService) {

  }

  initWithStoragePath(storagePath: string): void {
    this.storagePath = storagePath;
    if(!this.initializedWithValidStatus){
      this.boardService.deserialize(this.readFile(this.storagePath))
      this.initializedWithValidStatus = true;
    }
    if(this.subscription) this.subscription.unsubscribe();
    this.subscription = this.boardService.boards$.subscribe(boards => {
      this.writeFile(this.storagePath, this.boardService.serialize());
    });
  }

  readFile(filePath: string): any {
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

  writeFile(filePath: string, content: string): void {
    if (window.electron) {
      window.electron.writeFile(filePath, content);
    } else {
      localStorage.setItem("trep-tracker-status", content);
    }
    
  }
}

declare global {
  interface Window {
    electron?: {
      readFile: (filePath: string) => string;
      writeFile: (filePath: string, content: string) => string;
    };
  }
}
