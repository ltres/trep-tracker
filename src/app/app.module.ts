import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgxEditorModule } from 'ngx-editor';
import { MainBoardComponent } from './main-board/main-board.component';
import { TaskComponent } from './task/task.component';
import { AppComponent } from './app.component';
import { TaskService } from '../service/task.service';

@NgModule({
  declarations: [AppComponent,MainBoardComponent, TaskComponent],
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    NgxEditorModule
  ],
  providers: [TaskService],
  bootstrap: [AppComponent]
})
export class AppModule { }
