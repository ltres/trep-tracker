import { Component, HostBinding, OnInit } from '@angular/core';
import { VersionCheckRequest, VersionCheckResponse } from '../../types/types';
import { generateUUID } from '../../utils/utils';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'update-checker',
  templateUrl: './update-checker.component.html',
  styleUrl: './update-checker.component.scss',
})
export class UpdateCheckerComponent implements OnInit {
  checkUrl = 'https://update.trep-tracker.org';
  showToaster = true;
  open = false;
  response: VersionCheckResponse | undefined;
  remindUpdateAfterDays = 1;
  userVersion = environment.userVersion;

  @HostBinding('style.display')
  get showUpdateUI(): string {
    return this.showToaster && this.response && this.response.needsUpdate ? 'block' : 'none';
  }

  constructor(private httpClient: HttpClient) { }

  async ngOnInit(): Promise<void> {
    if( environment.environment !== 'electrified-prod' ){
      this.showToaster = false;
      return;
    }
    const latestClosedDate = localStorage.getItem('updateToasterClosed');
    if( latestClosedDate && new Date().getTime() - new Date(latestClosedDate).getTime() < this.remindUpdateAfterDays * 1000 * 3600 * 24  ){
      this.showToaster = false;
    }

    setTimeout( () => {
      this.showToaster = false;
    }, 60000 );

    const body = this.getCheckVersionData();
    let headers = new HttpHeaders();
    headers = headers.set('Content-Type', 'application/json; charset=utf-8');
    headers = headers.set('X-Amz-Content-Sha256', await this.sha256(JSON.stringify(body)));

    this.httpClient.post<VersionCheckResponse>(this.checkUrl, body, {
      headers,
    }).subscribe((res) => {
      this.response = res;
    });
  }

  closeAndDismiss() {
    this.showToaster = false;
    localStorage.setItem('updateToasterClosed', new Date().toISOString() );
  }

  private getCheckVersionData(): VersionCheckRequest {
    return {
      UUID: this.getUUID(),
      userVersion: environment.userVersion,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      hardwareConcurrency: navigator.hardwareConcurrency,
      platform: navigator.platform,
    };
  }
  private getUUID() {
    let uuid = localStorage.getItem('UUID');
    if (!uuid) {
      uuid = generateUUID(17);
      localStorage.setItem('UUID', uuid);
    }
    return uuid;
  }
  private async sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

}
