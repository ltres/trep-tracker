import { Component } from '@angular/core';
import { StorageService } from '../../service/storage.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'storage',
  templateUrl: './storage.component.html',
  styleUrl: './storage.component.scss'
})
export class StorageComponent {
  _storagePath: string | null = localStorage.getItem('storagePath');

  private debounce: any;

  get storagePath(): string | null {
    return this._storagePath;
  }

  set storagePath(value: string) {
    this._storagePath = value;
    if( this.debounce ){
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout( () => {
      if(this.storagePath === null) return;
      localStorage.setItem('storagePath', this._storagePath ?? "")
      this.storageService.initWithStoragePath(this.storagePath);
    },500)
  }

  constructor(private storageService: StorageService) {
    if(this.storagePath === null) return;
    this.storageService.initWithStoragePath(this.storagePath);
  }
}
