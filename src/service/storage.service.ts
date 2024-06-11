import { Injectable } from "@angular/core";
import { ipcRenderer } from 'electron';
import { BoardService } from "./board.service";


@Injectable({
    providedIn: 'root'
})
export class StorageService {
    storagePath = "C:/Users/l.tresoldi/Google Drive/trep-tracker-status";

    constructor(private boardService: BoardService) {
        console.log("Found file" + this.readFile(this.storagePath));

        this.boardService.boards$.subscribe(boards => {
            this.writeFile(this.storagePath, JSON.stringify(boards));
        });
    }

    readFile(filePath: string): any {
        // @ts-ignore
        return window.electron.readFile(filePath);
      }
    
      writeFile(filePath: string, content: string): void {
         // @ts-ignore
        window.electron.writeFile(filePath, content);
      }

}
