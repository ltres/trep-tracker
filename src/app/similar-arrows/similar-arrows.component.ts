import{ AfterViewInit, Component, Input, OnDestroy }from'@angular/core';
import LeaderLine from'leader-line-new';
import{ ContainerComponent }from'../base/base.component';

@Component( {
  selector: 'similar-arrows[source][destinations]',
  standalone: true,
  imports: [],
  templateUrl: './similar-arrows.component.html',
  styleUrl: './similar-arrows.component.scss'
} )
export class SimilarArrowsComponent implements AfterViewInit, OnDestroy{

  @Input() source:ContainerComponent | null | undefined;
  @Input() destinations!:ContainerComponent[] | null | undefined;

  lines : LeaderLine[] = []

  ngAfterViewInit(): void{
    if( !this.source || !this.destinations ){
      return
    }
    for( const d of this.destinations ){
      const el1 =  this.source.el.nativeElement as HTMLElement;
      const el2 =  d.el.nativeElement as HTMLElement;
      // document.getElementById(asd);
      const l = new LeaderLine(
        el1,
        el2,
        {path: 'grid', startSocket: 'right', endSocket: 'right', startPlug:"behind", endPlug:"square", size:2}
      )
      this.lines.push( l )
    }
  }
  ngOnDestroy(): void{
    this.lines.forEach( l => l.remove() )
  }
}
