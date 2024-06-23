import { Component, Input } from '@angular/core';
import { BoardService } from '../../service/board.service';
import { Lane, Task, getNewTask } from '../../types/task';
@Component({
  selector: 'importer[lane]',

  templateUrl: './importer.component.html',
  styleUrl: './importer.component.scss'
})
export class ImporterComponent {
  @Input() lane: Lane | undefined;
  protected toImport: string = "";
  
  constructor( private boardService: BoardService) { }

  import(){
    if(this.toImport.length == 0 || !this.lane){ return; }
    console.log("Importing: " + this.toImport);
    const lines = this.toImport.split('\n');
    console.log(lines);
    for(let line of lines){
      line = line.replace('☐', '');
      line = line.trim();
      
      if(line.length == 0){ continue; }
      let task: Task = getNewTask( line );
      this.boardService.addAsChild(this.lane, [task]);
    }
  }
} 