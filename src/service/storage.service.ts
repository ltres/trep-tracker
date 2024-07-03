import { Injectable, NgZone } from "@angular/core";
import { ipcRenderer } from 'electron';
import { BoardService } from "./board.service";
import { Subscription } from "rxjs";
import { environment } from "../environments/environment";
import { getStatusPath, setStatusPath } from "../utils/utils";


@Injectable({
  providedIn: 'root'
})
export class StorageService {
  storagePath: string | undefined;
  initializedWithValidStatus = false;
  subscription: Subscription | undefined;
  constructor(
    private boardService: BoardService,
    private zone: NgZone
  ) {
    
  }

  initWithStoragePath(storagePath: string): void {
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

  readFile(filePath: string): string {
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

