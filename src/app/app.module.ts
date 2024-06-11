import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BoardComponent } from './board/board.component';
import { TaskComponent } from './task/task.component';
import { AppComponent } from './app.component';
import { BoardService } from '../service/board.service';
import { LaneComponent } from './lane/lane.component';
import { KeyboardService } from '../service/keyboard.service';
import { KeyboardListenerComponent } from './keyboard-listener/keyboard-listener.component';
import { DragService } from '../service/drag.service';
import { RegistryService } from '../service/registry.service';
import { ContenteditableDirective } from './directive/contenteditable.directive';
import { TagDirective } from './directive/tag.directive';
import { TagService } from '../service/tag.service';
import { TagsViewerComponent } from './tags-viewer/tags-viewer.component';
import { StorageService } from '../service/storage.service';
import { StorageComponent } from './storage/storage.component';
 
@NgModule({
    declarations: [
        AppComponent,
         BoardComponent, 
         LaneComponent, 
         TaskComponent, 
         ContenteditableDirective, 
         TagDirective, 
         TagsViewerComponent,
         StorageComponent
        ],
    providers: [BoardService, KeyboardService, DragService, RegistryService, TagService, StorageService],
    bootstrap: [AppComponent],
    imports: [
        CommonModule,
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        KeyboardListenerComponent,
    ]
})
export class AppModule { }
