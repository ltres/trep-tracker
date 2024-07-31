import { AfterContentInit, Component, HostBinding, Inject, Input } from '@angular/core';
import { AiServiceI } from '../../types/ai';
import { Board, ISODateString } from '../../types/types';

@Component({
  selector: 'ai-advisor[board]',
  templateUrl: './ai-advisor.component.html',
  styleUrl: './ai-advisor.component.scss',
})
export class AiAdvisorComponent implements AfterContentInit{

  @Input() board!: Board;
  open: boolean = false;
  advice: string = 'Advice here';
  refreshDateISOString: ISODateString| undefined;
  apiKey: string | null = this.aiService.getApiKey();
  loading: boolean = false;

  @HostBinding('style.width')
  get width() {
    return this.open ? '40rem' : 'auto';
  }

  constructor(
    @Inject('AiServiceI') private aiService: AiServiceI,
  ) {}

  ngAfterContentInit(): void {
  // get latest advice from local storage:
    this.advice = localStorage.getItem('AIadvice') || 'No advice yet';
    this.refreshDateISOString = localStorage.getItem('AIadviceRefreshDateISOString') as ISODateString || undefined;
  }

  hasApiKey(): boolean {
    return this.aiService.getApiKey() != null;
  }

  async getInsight() {
    this.loading = true;
    this.advice = await this.aiService.getInsight(this.board);
    this.loading = false;
    localStorage.setItem('AIadvice', this.advice);
    const refreshDateISOString = new Date().toISOString();
    localStorage.setItem('AIadviceRefreshDateISOString', refreshDateISOString);
  }

  parseDate(arg0: ISODateString | undefined): Date | undefined {
    if(!arg0) return undefined;
    return new Date(arg0);
  }
  setApiKey(apiKey: string | null) {
    this.aiService.setApiKey(apiKey);
  }

}
