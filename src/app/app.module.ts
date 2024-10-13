import{ NgModule }from'@angular/core';
import{ CommonModule }from'@angular/common';
import{ FormsModule, ReactiveFormsModule }from'@angular/forms';
import{ BrowserModule }from'@angular/platform-browser';
import{ BoardComponent }from'./board/board.component';
import{ TaskComponent }from'./task/task.component';
import{ AppComponent }from'./app.component';
import{ BoardService }from'../service/board.service';
import{ LaneComponent }from'./lane/lane.component';
import{ KeyboardService }from'../service/keyboard.service';
import{ KeyboardListenerComponent }from'./keyboard-listener/keyboard-listener.component';
import{ DragService }from'../service/drag.service';
import{ ContainerComponentRegistryService }from'../service/registry.service';
import{ ContenteditableDirective }from'./directive/contenteditable.directive';
import{ TagService }from'../service/tag.service';
import{ TagsViewerComponent }from'./tags-viewer/tags-viewer.component';
import{ LaneMenuComponent }from'./lane-menu/lane-menu.component';
import{ BoardSelectionMenuComponent }from'./board-selection-menu/board-selection-menu.component';
import{ PrioritizerComponent }from'./prioritizer/prioritizer.component';
import{ ImporterComponent }from'./importer/importer.component';
import{ FontResizerComponent }from'./font-resizer/font-resizer.component';
import{ SearchComponent }from'./search/search.component';
import{ ModalComponent }from'./modal/modal.component';
import{ ModalService }from'../service/modal.service';
import{ WelcomeWizardManagerComponent }from'./welcome-wizard-manager/welcome-wizard-manager.component';
import{ StatusComponent }from'./task-status/status.component';
import{ TooltipDirective }from'./directive/tooltip.directive';
import{ TimeBarComponent }from'./time-bar/time-bar.component';
import{ environment }from'../environments/environment';
import{ LogoComponent }from'./dumb/logo/logo.component';
import{ DraggableDirective }from'./directive/draggable.directive';
import{ provideHttpClient, withInterceptorsFromDi }from'@angular/common/http';
import{ BoardToolbarComponent }from'./board-toolbar/board-toolbar.component';
import{ NotesComponent }from'./notes/notes.component';
import{ ClickComponent }from'./click/click.component';
import{ ClickService }from'../service/click.service';
import{ UpdateCheckerComponent }from'./update-checker/update-checker.component';
import{ GanttComponent }from'./gantt/gantt.component';
import{BrowserAnimationsModule, NoopAnimationsModule}from'@angular/platform-browser/animations';

import{ DatePickerComponent }from'./date-picker/date-picker.component';
import{ OWL_DATE_TIME_FORMATS, OwlDateTimeModule, OwlNativeDateTimeModule }from'@ltres/angular-datetime-picker';
import{ dateFormats }from'../types/constants';
import{ DroppableDirective }from'./directive/droppable.directive';
import{ SimilarArrowsComponent }from"./similar-arrows/similar-arrows.component";
import{ ChartsComponent }from'./charts/charts.component';
import{ ColorsService }from'../service/colors.service';
import{ ChartComponent }from'./chart/chart.component';
import{ ChartService }from'../service/chart.service';
import{ GanttButtonComponent }from'./gantt-button/gantt-button.component';

@NgModule( { declarations: [
  AppComponent,
  BoardComponent,
  LaneComponent,
  TaskComponent,
  ContenteditableDirective,
  TagsViewerComponent,
  LaneMenuComponent,
  BoardSelectionMenuComponent,
  PrioritizerComponent,
  ImporterComponent,
  FontResizerComponent,
  SearchComponent,
  ModalComponent,
  WelcomeWizardManagerComponent,
  StatusComponent,
  TooltipDirective,
  TimeBarComponent,
  LogoComponent,
  DraggableDirective,
  BoardToolbarComponent,
  NotesComponent,
  ClickComponent,
  GanttComponent,
  UpdateCheckerComponent,
  DatePickerComponent,
  DroppableDirective,
  ChartComponent,
  ChartsComponent,
  GanttButtonComponent
],
bootstrap: [AppComponent], 
imports: [
  CommonModule,
  BrowserModule,
  FormsModule,
  ReactiveFormsModule,
  KeyboardListenerComponent,
  OwlDateTimeModule,
  OwlNativeDateTimeModule,
  NoopAnimationsModule, 
  SimilarArrowsComponent,
  BrowserAnimationsModule,
  
], 
providers: [
  BoardService,
  KeyboardService,
  DragService,
  ContainerComponentRegistryService,
  TagService,
  ModalService,
  ClickService,
  ColorsService,
  OwlDateTimeModule,
  OwlNativeDateTimeModule,
  ChartService,
  {provide: OWL_DATE_TIME_FORMATS, useValue: dateFormats},
  {
    provide: 'StorageServiceAbstract',
    useClass: environment.storageService,
  },
  provideHttpClient( withInterceptorsFromDi() )
] } )
export class AppModule{ }
