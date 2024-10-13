/* eslint-disable @typescript-eslint/ban-ts-comment */
import{ AfterViewInit, Component, EventEmitter, HostBinding, Input, Output, TemplateRef, ViewChild }from'@angular/core';
import{ BoardService }from'../../service/board.service';
import{ AddFloatingLaneParams, Board, Layout, Locale, Tag, Task, Timezone }from'../../types/types';
import{ ModalService }from'../../service/modal.service';
import{ Observable, map }from'rxjs';
import{ layoutValues }from'../../types/constants';
import ISO6391 from'iso-639-1';
import{ getTimezoneShortName }from'../../utils/date-utils';
import{ TagService }from'../../service/tag.service';

@Component( {
  selector: 'board-toolbar[board]',
  templateUrl: './board-toolbar.component.html',
  styleUrl: './board-toolbar.component.scss',
} )
export class BoardToolbarComponent implements AfterViewInit{
  @ViewChild( 'gantt' ) ganttTemplate: TemplateRef<unknown> | null = null;
  @Input() board!: Board;
  @HostBinding( 'class' )
  @Output() onInit:EventEmitter<void> = new EventEmitter()

  debounce: ReturnType<typeof setTimeout> | undefined;
  open: boolean = true;
  menuOpen = false;
  showDatesPreferences: boolean = false;
  showActions: boolean = true;

  constructor(
    protected boardService: BoardService,
    protected modalService: ModalService,
    private tagService: TagService
  ){ }
  ngAfterViewInit(): void{
    this.onInit.emit()
  }

  getLayouts(): Layout[]{
    return Object.keys( layoutValues ) as Layout[];
  }

  setLayout( layout: Layout ){
    this.board.layout = layout;
    this.boardService.publishBoardUpdate();
  }

  debounceBoardUpdate(){
    if( this.debounce ){
      clearTimeout( this.debounce );
    }
    this.debounce = setTimeout( () => {
      this.boardService.publishBoardUpdate();
    }, 500 );
  }

  updateBoardTags( $event: Tag[] ){
    const allOldPresent = this.board.tags.filter( oldTag => $event.find( r => r.tag.toLowerCase() === oldTag.tag.toLowerCase() && r.type === oldTag.type ) ).length === this.board.tags.length;
    const allNewPresent = $event.filter( oldTag => this.board.tags.find( r => r.tag.toLowerCase() === oldTag.tag.toLowerCase() && r.type === oldTag.type ) ).length === $event.length;

    this.tagService.setLatestEditedTagsContainer( this.board )

    if( !allOldPresent || !allNewPresent ){
      this.board.tags = $event;
      this.debounceBoardUpdate();
    }
  }

  addLane(){
    const params: AddFloatingLaneParams ={
      board:this.board, 
      x: window.innerWidth / 2, 
      y: window.innerHeight / 2, 
      children: [], 
      archive:false, 
      width:300,
      position: {
        layout: this.board.layout,
        column: 0,
        order: 0
      }
    }
    this.boardService.addFloatingLane( params );
  }

  getLayoutSymbol( layout: Layout ){
    return layoutValues[layout].symbol;
  }

  openGantt(){
    this.modalService.setModalContent( this.ganttTemplate );
    this.modalService.setDisplayModal( true, 'full' );
  }

  getGanttTasks$(): Observable<Task[] | undefined>{
    return this.boardService.getTasksForBoard$( this.board ).pipe(
      map( tasks => this.boardService.getTasksForGantt( tasks ) ),
    );
  }

  getAvailablePropValues( arg: string ): ( string|boolean|undefined )[]{
    switch( arg ){
      case"timeZoneName":
        return["short", "long", "shortOffset", "longOffset", "shortGeneric", "longGeneric"]
      case"weekday":
        return["long", "short", "narrow"]
      case"hour12":
        return[true, false]
      case"year":
        return["numeric", "2-digit"]
      case"month":
        return["numeric", "2-digit", "long", "short", "narrow"]
      case"day":
        return["numeric", "2-digit"]
      case"time":
        return["numeric", "2-digit"]
      default:
        return[]
    }
  }
  setFormatPropValue( key: keyof Intl.DateTimeFormatOptions, val: string|boolean|undefined ){
    // @ts-expect-error
    if( key === 'time' ){
      // @ts-expect-error
      this.board.datesConfig.dateFormat.hour = val;
      // @ts-expect-error
      this.board.datesConfig.dateFormat.minute = val;
    }else{
      // @ts-expect-error
      this.board.datesConfig.dateFormat[key] = val;
    }
    this.debounceBoardUpdate();
  }

  beautify( arg: string|undefined|boolean ){
    return typeof arg !== 'undefined' ?  arg.toString().charAt( 0 ).toUpperCase() + arg.toString().slice( 1 ) : ""
  }

  match( key: keyof Intl.DateTimeFormatOptions, val: string|boolean|undefined ){
    // @ts-expect-error
    if( key === 'time' ){
      return this.board.datesConfig.dateFormat.hour === val;
    }else{
      return this.board.datesConfig.dateFormat[key] === val;
    }
  }

  getLocales(): Locale[]{
    return ISO6391.getAllCodes();
  }

  setLocale( $event: Event ){
    this.board.datesConfig.locale = ( $event.target as HTMLInputElement ).value;
    this.debounceBoardUpdate();
  }

  getLocaleNiceName( locale: Locale ){
    return`${locale} - ${ISO6391.getName( locale )}`
  }

  getTimezones(): Timezone[]{
    return Intl.supportedValuesOf( 'timeZone' )
  }
  setTimezone( $event: Event ){
    this.board.datesConfig.dateFormat.timeZone = ( $event.target as HTMLInputElement ).value;
    this.debounceBoardUpdate();
  }

  names: {[key:string]: string} = {}
  getTimezoneNiceName( t: Timezone ){
    let shortName = ""
    if( this.names[t] ){
      shortName = this.names[t]
    }else{
      this.names[t] = getTimezoneShortName( t );
      shortName = this.names[t]
    }

    return`${t} - ${shortName}`
  }

}
