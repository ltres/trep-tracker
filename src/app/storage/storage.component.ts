import { Component } from '@angular/core';
import { StorageService } from '../../service/storage.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'storage',
  templateUrl: './storage.component.html',
  styleUrl: './storage.component.scss'
})
export class StorageComponent {
  _storagePath: string = localStorage.getItem('storagePath') || "C:/";

  get storagePath(): string {
    return this._storagePath;
  }

  set storagePath(value: string) {
    this._storagePath = value;
    localStorage.setItem('storagePath', this._storagePath)
    this.storageService.initWithStoragePath(this.storagePath);
  }

  constructor(private storageService: StorageService) {
    this.storageService.initWithStoragePath(this.storagePath);
  }
}
