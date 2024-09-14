import{ AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, forwardRef, HostBinding, HostListener, Input, OnInit, QueryList, ViewChildren }from'@angular/core';
import{ AddFloatingLaneParams, Board, Container, Lane, Layout, Tag }from'../../types/types';
import{ BoardService }from'../../service/board.service';
import{ Observable }from'rxjs';
import{ LaneComponent }from'../lane/lane.component';
import{ hashCode }from'../../utils/utils';
import{ DragService }from'../../service/drag.service';
import{ KeyboardService }from'../../service/keyboard.service';
import{ ContainerComponent }from'../base/base.component';
import{ ContainerComponentRegistryService }from'../../service/registry.service';
import{ layoutValues }from'../../types/constants';
import{ isLane, isTask }from'../../utils/guards';

@Component( {
  selector: 'board',
  //standalone: true,
  //imports: [TaskComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ContainerComponent, useExisting: forwardRef( () => BoardComponent ) },
  ],
} )
export class BoardComponent extends ContainerComponent implements OnInit, AfterViewInit{
  @Input() board!: Board;
  @ViewChildren( LaneComponent, { read: ElementRef } ) laneComponentsElRefs: QueryList<ElementRef> | undefined;
  @ViewChildren( LaneComponent ) laneComponents: QueryList<LaneComponent> | undefined;

  @HostBinding( 'style.height.px' )
  protected _height: number | undefined = 0;
  protected get height(): number | undefined{
    return this.board.layout === 'absolute' ? this._height : undefined;
  };

  private _width: number | undefined = 0;
  @HostBinding( 'style.width.px' )
  protected get width(): number | undefined{ return this.board.layout === 'absolute' ? this._width : undefined;
  };

  @HostBinding( 'class.absolute' )
  protected get minWidth(): boolean{
    return this.board.layout === 'absolute';
  };

  @HostBinding( 'class' )
  protected get layoutClass(){
    return this.board.layout;
  }

  debounce: ReturnType<typeof setTimeout> | undefined;

  constructor(
    protected boardService: BoardService,
    protected keyboardService: KeyboardService,
    protected override registry: ContainerComponentRegistryService,
    protected dragService: DragService,
    public override el: ElementRef,
    private cdr: ChangeDetectorRef,
  ){
    super( registry, el );
  }
   
  receiveDrop( column: number, layout: Layout, preceedingLane: Lane | undefined, container: Container, event?: DragEvent ){
    if( isLane( container ) ){
      if( this.board.layout === 'absolute' ){
        // Nothing to do
      }else{
        container.layouts[layout].column = column;

        // redistribute the indexes for the column
        this.board.children = this.board.children.filter( c => c.id !== container.id );
        this.board.children.splice( preceedingLane ? this.board.children.map( c => c.id ).indexOf( preceedingLane?.id ) + 1 : 0 , 0, container )
        this.board.children.filter( c => c.layouts[this.board.layout].column === column ).forEach( ( child,index ) => {
          child.layouts[layout].order = index;
        } )

        this.boardService.publishBoardUpdate()
      }
    }else if( isTask( container ) ){
      const params: AddFloatingLaneParams ={
        board: this.board, 
        x:( event?.clientX ) ?? 0 + window.scrollX, 
        y:( event?.clientY ) ?? 0 + window.scrollY, 
        children: [container],
        position: {
          layout,
          column,
          order: 0
        },
        archive:false, 
        width:300
      }
      const lane = this.boardService.addFloatingLane( params );
      this.board.children = this.board.children.filter( c => c.id !== lane.id );
      this.board.children.splice( preceedingLane ? this.board.children.map( c => c.id ).indexOf( preceedingLane?.id ) + 1 : 0 , 0, lane )
      this.board.children.filter( c => c.layouts[this.board.layout].column === column ).forEach( ( child,index ) => {
        child.layouts[layout].order = index;
      } )

      this.boardService.publishBoardUpdate()

    }else{
      throw new Error( "Object not droppable on board" )
    }
  };

  override ngOnInit(): void{
    super.ngOnInit();
    this.boardService.boards$.subscribe( () => {
      this.cdr.detectChanges();
    } );
  }

  ngAfterViewInit(): void{
    if( this.board.layout === 'absolute' )return;
    this.subscriptions = this.boardService.boards$.subscribe( () => {
      // set the board height basing on the childrens size.
      const boardEl = this.el.nativeElement as HTMLElement;
      const laneEls = boardEl.querySelectorAll( 'lane' );
      setTimeout( () => {
        this._height = 0;
        this._width = 0;
        laneEls.forEach( laneEl => {
          const maxHeight = laneEl.getBoundingClientRect().height + laneEl.getBoundingClientRect().top + window.scrollY;
          if( maxHeight > ( this.height ?? 0 ) ){
            this._height = maxHeight;
          }
          const maxWidth = laneEl.getBoundingClientRect().width + laneEl.getBoundingClientRect().left + window.scrollX;
          if( maxWidth > ( this.width ?? 0 ) ){
            this._width = maxWidth;
          }
        } );
      } );
      //this.cdr.detectChanges();
    } );
  //this.cdr.detectChanges();
  }

  @HostListener( 'window:resize', ['$event'] )
  onResize(){
    if( window.innerWidth < 800 ){
      this.board.layout = 'flex1';
    }
  }

  get lanes$(): Observable<Lane[]>{
    return this.boardService.getLanes$( this.board );
  }
  getLanesByColumn$( col: number ): Observable<Lane[]>{
    return this.boardService.getLanes$( this.board, col );
  }

  override get container(): Container{
    return this.board;
  }

  addLane(){
    const params: AddFloatingLaneParams ={
      board:this.board, 
      x:this.el.nativeElement.getBoundingClientRect().width / 2, 
      y:this.el.nativeElement.getBoundingClientRect().height / 2, 
      children: [], 
      archive:false, 
      width:300
    }
    this.boardService.addFloatingLane( params );
  }

  updateBoardTags( $event: Tag[] ){
    const allOldPresent = this.board.tags.filter( oldTag => $event.map( t => t.tag.toLowerCase() ).find( r => r === oldTag.tag.toLowerCase() ) ).length === this.board.tags.length;
    const allNewPresent = $event.filter( oldTag => this.board.tags.map( t => t.tag.toLowerCase() ).find( r => r === oldTag.tag.toLowerCase() ) ).length === $event.length;

    if( !allOldPresent || !allNewPresent ){
      this.board.tags = $event;
      this.debounceBoardUpdate();
    }
  }

  debounceBoardUpdate(){
    if( this.debounce ){
      clearTimeout( this.debounce );
    }
    this.debounce = setTimeout( () => {
      this.boardService.publishBoardUpdate();
    }, 500 );
  }

  hashCode( idx:number, lane: Lane ): number{
    return hashCode( lane.id );
  }

  setLayout( layout: Layout ){
    this.board.layout = layout;
    this.boardService.publishBoardUpdate();
  }

  getLayouts(): Layout[]{
    return Object.keys( layoutValues ) as Layout[];
  }

  getColumnIndexes( layout: Layout ): number[]{
    return Array.from( { length: layoutValues[layout].columns }, ( _,index ) => index );
  }

  getLayoutSymbol( layout: Layout ){
    return layoutValues[layout].symbol;
  }

}
