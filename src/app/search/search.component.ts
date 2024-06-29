import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { BoardService } from '../../service/board.service';

@Component({
  selector: 'search',

  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {
  @ViewChild('input') searchInput!: ElementRef;
  searchPhrase: string | undefined;
  matchNumber: number = 0;
  private debounce: any;

  constructor(
    private boardService: BoardService,
    private el: ElementRef
  ) {
    this.boardService.focusSearch$.subscribe(fs => {
      if (fs) {
        if( this.searchPhrase ){
          this.highlightText(this.searchPhrase, true);
        }else{
          this.focusInput(true)
        }
      }
    })
  }

  change(){
    if(!this.searchPhrase)return;
    if( this.debounce ){
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout( () => {
      this.highlightText(this.searchPhrase!, false);
    },250)

  }

  highlightText(searchTerm: string, selectAll: boolean) {
    this.matchNumber = 0;
    if(searchTerm.length < 2 )return;
    document.designMode = "on";
    this.removeHighlights();
    //var sel = window.getSelection();
    //sel?.collapse(document.body, 0);

    while (window.find(searchTerm)) {
      this.matchNumber ++;
      document.execCommand("HiliteColor", false, "darkblue");
      //sel?.collapseToEnd();
    }
    document.designMode = "off";
    this.focusInput(selectAll);
  }

  removeHighlights() {
    const highlights = document.querySelectorAll('span[style="background-color: darkblue;"]');
    highlights.forEach(span => {
        const parent = span.parentNode;
        parent?.replaceChild(document.createTextNode(span.textContent ?? ""), span);
        parent?.normalize();
    });
  }

  onFocus() {
    if( this.searchPhrase ){
      //this.highlightText(this.searchPhrase, false);
    }
    //this.boardService.blurSearch();
  }

  onBlur() {
    this.removeHighlights()
    this.boardService.blurSearch();
  }

  private focusInput( selectAll: boolean){
    const input = this.searchInput.nativeElement;
    // input.click();
    input.focus();
    input.setSelectionRange(selectAll ? 0 : input.value.length, input.value.length);
  }

}

declare global {
  interface Window {
    find: (searchTerm: string) => boolean;
    getSelection: () => Selection | null;
    execCommand: (command: string, showUI?: boolean, value?: string) => void;
  }
}