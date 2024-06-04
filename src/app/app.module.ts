import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgxEditorModule } from 'ngx-editor';
import { BoardComponent } from './board/board.component';
import { TaskComponent } from './task/task.component';
import { AppComponent } from './app.component';
import { BoardService } from '../service/board.service';
import { LaneComponent } from './lane/lane.component';
import { KeyboardService } from '../service/keyboard.service';
import { KeyboardListenerComponent } from './keyboard-listener/keyboard-listener.component';
import { DragService } from '../service/drag.service';

@NgModule({
    declarations: [AppComponent, BoardComponent, LaneComponent, TaskComponent],
    providers: [BoardService, KeyboardService, DragService],
    bootstrap: [AppComponent],
    imports: [
        CommonModule,
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        NgxEditorModule,
        KeyboardListenerComponent
    ]
})
export class AppModule { }
