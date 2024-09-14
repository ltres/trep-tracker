import{ Component, EventEmitter, Input, OnDestroy, Output }from'@angular/core';
import{ Subject }from'rxjs';
import{ debounceTime }from'rxjs/operators';

@Component( {
  selector: 'notes[notes]',
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.scss',
} )
export class NotesComponent implements OnDestroy{
  @Input() notes: string | undefined = '';
  @Output() onNoteChanged: EventEmitter<string> = new EventEmitter();

  private noteSubject: Subject<string> = new Subject();

  constructor(){
    this.noteSubject.pipe( debounceTime( 500 ) ).subscribe( ( ev: string ) => {
      this.onNoteChanged.emit( ev );
    } );
  }
  ngOnDestroy(): void{
    this.noteSubject.complete();
    this.onNoteChanged.emit( this.notes );
  }

  emitNotes( ev: string ){
    this.notes = ev;
    this.noteSubject.next( ev );
  }
}
