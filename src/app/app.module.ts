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
import { TagService } from '../service/tag.service';
import { TagsViewerComponent } from './tags-viewer/tags-viewer.component';
import { StorageService } from '../service/storage.service';
import { StorageComponent } from './storage/storage.component';
import { LaneMenuComponent } from './lane-menu/lane-menu.component';
import { BoardSelectionMenuComponent } from './board-selection-menu/board-selection-menu.component';
import { PrioritizerComponent } from './prioritizer/prioritizer.component';
import { ImporterComponent } from './importer/importer.component';
import { FontResizerComponent } from './font-resizer/font-resizer.component';
import { SearchComponent } from './search/search.component';
import { ModalComponent } from './modal/modal.component';
import { ModalService } from '../service/modal.service';
import { WelcomeWizardManagerComponent } from './welcome-wizard-manager/welcome-wizard-manager.component';
import { ElectronService } from '../service/electron.service';
import { StatusComponent } from './task-status/status.component';
import { TooltipDirective } from './directive/tooltip.directive';
 
@NgModule({
    declarations: [
        AppComponent,
         BoardComponent, 
         LaneComponent, 
         TaskComponent, 
         ContenteditableDirective, 
         TagsViewerComponent,
         StorageComponent,
         LaneMenuComponent,
         BoardSelectionMenuComponent,
         PrioritizerComponent,
         ImporterComponent,
         FontResizerComponent,
         SearchComponent,
         ModalComponent,
         WelcomeWizardManagerComponent,
         StatusComponent,
         TooltipDirective
        ],
    providers: [
        BoardService, 
        KeyboardService, 
        DragService, 
        RegistryService, 
        TagService, 
        StorageService,
        ModalService,
        ElectronService
    ],
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
