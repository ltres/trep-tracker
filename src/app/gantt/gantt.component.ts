import { AfterViewInit, ApplicationRef, Component, createComponent, Input } from '@angular/core';
import { Board, GanttTask, getNewTask, TagTypes, Task } from '../../types/types';
import { BoardService } from '../../service/board.service';
import { gantt, Task as DhtmlxTask, GanttStatic, Link as DhtmlxLink } from 'dhtmlx-gantt';
import { TaskComponent } from '../task/task.component';
import { toIsoString, addUnitsToDate, toUTCDate } from '../../utils/date-utils';
import { getFirstMentionTag, mapToGanttRecurrence, initGanttData, getTaskBackgroundColor } from '../../utils/utils';
import {  GanttConfig } from '../../types/config';

@Component({
  selector: 'gantt[tasks][board]',
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss',
})
export class GanttComponent implements AfterViewInit {

  @Input() tasks!: Task[] | undefined | null;
  @Input() board! : Board;

  cachedTasks: Task[] | undefined;
  today = new Date();
  selectedView: "months" | "days" | "hours" = 'days'

  constructor(
    protected boardService: BoardService,
    protected applicationRef: ApplicationRef
  ) { }

  ngAfterViewInit(): void {
    this.setupGantt(gantt);

    this.init();
  }

  private init(){
    if (!this.tasks) {
      throw new Error('Tasks must be defined to open gantt');
    }

    gantt.clearAll();

    if(!this.cachedTasks){
      this.cachedTasks = [...this.tasks];
    }

    /** Convert the local datamodel to the one gantt requires */
    const dataModel = this.toDhtmlxGanttDataModel(this.cachedTasks, [], [], undefined, undefined );

    /** Initial task sort */
    dataModel.convertedTasks = dataModel.convertedTasks.sort((a, b) => a['order'] - b['order']);

    gantt.parse({data:dataModel.convertedTasks, links: dataModel.convertedLinks});

    gantt.init('gantt');

    this.ganttAfterInitOperations(gantt)
  }

  /**
   * Called from the gantt when a task gets modified via the GUI
   */
  updateTask(data: DhtmlxTask) {
    const toUpdate = this.boardService.getTask(data.id.toString());
    if (!toUpdate || !toUpdate.gantt) {
      console.log('Task ' + toUpdate?.id + 'not found');
    } else {
      if(data.start_date){
        toUpdate.gantt.startDate = toUTCDate(data.start_date as unknown as string);
      }
      if(data.end_date){
        toUpdate.gantt.endDate = toUTCDate(data.end_date as unknown as string);
      }
      toUpdate.gantt.progress = data.progress ?? 0;
      toUpdate.textContent = data.text;
      // toUpdate.gantt.duration = data.duration;
    }

    let order = 0;
    gantt.eachTask((task) => {
      const toOrder = this.boardService.getTask(task.id);
      if (!toOrder || !toOrder.gantt) {
        console.warn('Task not found');
        return;
      }
      if (toOrder.gantt.order && order === 0) {
        order = toOrder.gantt.order;
      }
      toOrder.gantt.order = order++;
    });

    this.boardService.publishBoardUpdate();
    if( data['hasRecurrence'] ){
      // A recurrence step has been modified. We should redraw the whole gantt
      this.init();
    }

  }
  createTask() {
    throw new Error('Method not implemented.');
  }
  updateLink() {
    throw new Error('Method not implemented.');
  }
  createLink(data: DhtmlxLink) {
    const source = this.boardService.getTask(data.source.toString());
    const target = this.boardService.getTask(data.target.toString());
    if (!source || !target) {
      throw new Error('Task not found');
    }

    source.gantt!.successors = source.gantt!.successors ?? [];
    source.gantt!.successors.push({
      taskId: target.id,
      linkId: data.id.toString(),
    });
    this.boardService.publishBoardUpdate();
  }
  deleteLink(id: string) {
    this.boardService.allTasks?.forEach(task => {
      if (task.gantt?.successors) {
        task.gantt.successors = task.gantt.successors.filter(p => p.linkId !== id);
      }
    });
    this.boardService.publishBoardUpdate();
  }

  private toDhtmlxGanttDataModel(tasks: Task[], convertedTasks: DhtmlxTask[], convertedLinks: DhtmlxLink[], parentId: string | undefined, tasksCssClass: string | undefined): { convertedTasks: DhtmlxTask[], convertedLinks: DhtmlxLink[] } {

    let order = convertedTasks.length;

    for (const task of tasks) {
      if(convertedTasks.find(t => t.id === task.id)){
        continue;
      }
      const lastDateInConverted = convertedTasks[convertedTasks.length-1]?.end_date ?? new Date();

      // Init the gantt data and convert
      const initializedTask = initGanttData(task, lastDateInConverted);
      const firstResourceTag = task.tags?.find(t => t.type === TagTypes.tagOrange )?.tag;
      const dhtmlxTask = this.toDhtmlxTask(initializedTask, firstResourceTag ? getTaskBackgroundColor(firstResourceTag) : undefined, order++, parentId, tasksCssClass, false);
      convertedTasks.push(dhtmlxTask);

      if( initializedTask.gantt?.recurrence ){
        // Task has recurrence. Generate K temporary 'recurrent-task' rows after this task.
        this.generateCenteredRecurrence(new Date(),initializedTask, order, initializedTask.id).forEach( (recurrence) => {

          convertedTasks.push(recurrence);
        });
      }

      if (task.children.length > 0) {
        this.toDhtmlxGanttDataModel(task.children, convertedTasks, convertedLinks, task.id, tasksCssClass);
      }

      // Build task links
      if (task.gantt?.successors) {
        for (const successor of task.gantt.successors) {
          const link: DhtmlxLink = {
            id: successor.linkId,
            source: task.id,
            target: successor.taskId,
            editable: true,
            type: '0',
          };
          convertedLinks.push(link);
          // It may happen that a successor is not between the tasks or their descendants. We need to retrieve it and process it.
          if (tasks.map(t => t.id).indexOf(successor.taskId) < 0) {
            const retrievedSucc = this.boardService.getTask(successor.taskId);
            if (!retrievedSucc) {
              console.error('Task ' + successor.taskId + ' not found');
            } else {
              this.toDhtmlxGanttDataModel([retrievedSucc], convertedTasks, convertedLinks, task.id, GanttConfig.externalTaskCssClass);
            }
          }
        }
      }
    }

    return {convertedTasks,convertedLinks};
  }

  /**
   * Configures the gantt object
   */
  private setupGantt(gantt: GanttStatic){
    
    gantt.plugins({
      multiselect: true,
      marker: true,
    });

    this.selectView(this.selectedView);

    gantt.config.min_column_width = 25; // Set to your desired width in pixels

    gantt.config.multiselect = true;
    gantt.config.multiselect_one_level = false;
    // default columns definition

    gantt.config.columns = [
      {
        name: 'mention',
        label: 'Mention',
        width: 100,
        template: (task) => {
          return task['mention'];
        },
        sort: function(a, b) {
          const cmp = a['mention']?.toLowerCase().localeCompare(b['mention']?.toLowerCase());
          if(cmp !== 0){
            return cmp;
          }
          return (a.start_date?.getTime() ?? 0) - (b.start_date?.getTime() ?? 0);
        },
      },
      { name: 'text', label: 'Task name', min_width: 300, width: '*', tree: true, 
        template: (task) =>{
          return this.getTaskComponentHTML(task);
        } },
      { name: 'start_date', label: 'Start time', align: 'center' },
      { name: 'duration', label: 'Duration', align: 'center' },
    ];

    gantt.templates.grid_file = function() {
      return "";
    };
    gantt.config.sort = true;

    const start = new Date(Date.UTC(this.today.getUTCFullYear(), this.today.getUTCMonth(), 0));
    const end = new Date(Date.UTC(this.today.getUTCFullYear(), this.today.getUTCMonth() + GanttConfig.shownMonths, 0));

    gantt.config.work_time = true;
    gantt.setWorkTime({ hours: [`${GanttConfig.startOfDay}:00-${GanttConfig.endOfDay}:00`] });//global working hours. 8:00-12:00, 13:00-17:00
    gantt.templates.timeline_cell_class = function (task, date) {
      if (!gantt.isWorkTime(date)) {
        return 'gantt-weekend';
      }
      return '';
    };
    gantt.config.start_date = start;
    gantt.config.end_date = end;
    gantt.attachEvent('onBeforeTaskDelete', function () {
      gantt.message({ type: 'error', text: 'Cannot delete tasks from this view' });
      return false;
    });
    gantt.templates.task_class = function (start, end, task) {
      if (gantt.hasChild(task.id)) {
        return 'gantt-parent-task';
      }
      if (task['css']) {
        return task['css'];
      }
    };
    gantt.templates.task_row_class = function(start, end, task){
      if(task['isRecurrenceStep'] === true || task['isRecurrenceStep'] === "highlighted" ){
        return "recurrent-task-row";
      }else if(task['isRecurrenceStep'] === "last"){
        return "recurrent-task-row last";
      }
      if( task['hasRecurrence'] ){
        return "has-recurrence-task-row";
      }

      return "";
    };

    gantt.templates.grid_row_class = function(start, end, task) {
      if(task['isRecurrenceStep'] === true || task['isRecurrenceStep'] === "highlighted"){
        return "recurrent-task-row";
      }else if(task['isRecurrenceStep'] === "last"){
        return "recurrent-task-row last";
      }
      if( task['hasRecurrence'] ){
        return "has-recurrence-task-row";
      }
      return "";
    };

    gantt.config.order_branch = true;
    gantt.config.date_format = "%Y-%m-%d %H:%i";

  }

  /**
   * Performs after init operations and attaches update listeners for tasks and links
   */
  private ganttAfterInitOperations(gantt: GanttStatic){
    gantt.showDate(this.today);
    gantt.addMarker({ 
      start_date: new Date(), 
      css: "today", 
      title:"Today"
    });
    if (!(gantt as unknown as {$_initOnce?:boolean}).$_initOnce) {
      (gantt as unknown as {$_initOnce?:boolean}).$_initOnce = true;

      gantt.createDataProcessor({
        task: {
          update: (data: DhtmlxTask) => this.updateTask(data),
          create: () => this.createTask(),
          // delete: (id: string) => console.log(id),
        },
        link: {
          update: () => this.updateLink(),
          create: (data: DhtmlxLink) => this.createLink(data),
          delete: (id: string) => this.deleteLink(id),
        },
      });
    }
  }

  /**
   * Converts a local task to a DHX task
   */
  private toDhtmlxTask(task:GanttTask, color: string | undefined, order: number, parentId: string | undefined, cssClass: string | undefined, isRecurrenceStep: boolean | "highlighted" | "last" ): DhtmlxTask{
    const isProject = task.children.length > 0; 
    const dhtmlxTask: DhtmlxTask = {
      id: task.id,
      text: isRecurrenceStep ? "" : task.textContent,
      type: isProject ? 'project' : 'task',
      start_date: isProject? undefined : new Date(task.gantt.startDate),
      end_date:  isProject? undefined : new Date(task.gantt.endDate),
      parent: parentId,
      progress: task.gantt?.progress ?? 0,
      css: cssClass,
      row_height: isRecurrenceStep && isRecurrenceStep !== 'highlighted' ? GanttConfig.recurrentTaskHeight : undefined,
      bar_height: isRecurrenceStep && isRecurrenceStep !== 'highlighted'? GanttConfig.recurrentTaskHeight : undefined,
      color,
      order: order,
      mention: getFirstMentionTag(task),
      hasRecurrence: task.gantt.recurrence,
      isRecurrenceStep: isRecurrenceStep,
      readonly: !!isRecurrenceStep,
      open: true,
      trepTask: task
    };
    if(!parentId){
      delete dhtmlxTask.parent
    }
    return dhtmlxTask;
  }

  /**
   *  Returns the html for a task using the TaskComponent 
   */
  private getTaskComponentHTML(task: DhtmlxTask): string{
    if(task['isRecurrenceStep']){
      return ""
    }
    const component = createComponent(TaskComponent, {environmentInjector: this.applicationRef.injector})
    const t = task['trepTask'] as GanttTask;
    if(!t){
      // may be a recurrence
      throw new Error("Task not found");
    }
    component.instance.task = t;
    component.instance.staticView = true;
    const l = this.boardService.findParentLane([t]);
    if(l){
      component.instance.lane = l;
      component.instance.parent = l
    }
    component.instance.board = this.board;
    component.instance.enableGanttView = true
    component.instance.showChildren = false;
    component.changeDetectorRef.detectChanges();
    const html = component.location.nativeElement.outerHTML;
    component.destroy();
    return html;
  }

  /**
   * Starting from the task, generates an array of recurrences centered about the provided date.
   * Task could originally have been planned in the past, so this is accounted for.
   * If the date is inside a recurrence date, the task will be shown in full, otherwise it will be rendered as a recurrence step.
   * If the date is not inside a recurrence date, the next recurrence will be shown in full.
   * @param date the date on which to center
   * @param task the recurrent task
   */
  private generateCenteredRecurrence( date: Date, task: GanttTask, order: number, parentId: string | undefined ): DhtmlxTask[]{
    if(!task.gantt?.recurrence){
      return [];
    }
    const firstResourceTag = task.tags?.find(t => t.type === TagTypes.tagOrange )?.tag;
    const ret : DhtmlxTask[] = []
    /*
    // get previous:
    for( let i = -GanttConfig.recurrenceIterationsShown / 2 + 1; i < 0 ; i++  ){
      const recurrenceStartDate = addUnitsToDate(task.gantt.startDate, i, mapToGanttRecurrence(task.gantt.recurrence));
      const recurrenceEndDate = addUnitsToDate(task.gantt.endDate, i, mapToGanttRecurrence(task.gantt.recurrence));
      const child = initGanttData( getNewTask(task.createdLaneId, `${task.id}-recurrence-${i}` ) , new Date());
      child.gantt.startDate = toIsoString(recurrenceStartDate);
      child.gantt.endDate = toIsoString(recurrenceEndDate);
      ret.push( this.toDhtmlxTask(child, order++, parentId, GanttConfig.recurrentTaskCssClass, true));
    }
      
    // central recurrence:
    const centeredChild = initGanttData( getNewTask(task.createdLaneId, `` ) , new Date());
    centeredChild.gantt.startDate = task.gantt.startDate;
    centeredChild.gantt.endDate = task.gantt.endDate;
    ret.push(this.toDhtmlxTask(centeredChild, order++, parentId, GanttConfig.recurrentTaskCssClass + " highlighted" , "highlighted" ));
*/
    // get next:
    for( let i = -1; i < GanttConfig.recurrenceIterationsShown / 2 + 1; i++  ){
      if( i == 0) continue;
      const recurrenceStartDate = addUnitsToDate(task.gantt.startDate, i, mapToGanttRecurrence(task.gantt.recurrence));
      const recurrenceEndDate = addUnitsToDate(task.gantt.endDate, i, mapToGanttRecurrence(task.gantt.recurrence));
      const child = initGanttData( getNewTask(task.createdLaneId, `${task.id}-recurrence-${i}` ) , new Date());
      child.gantt.startDate = toIsoString(recurrenceStartDate);
      child.gantt.endDate = toIsoString(recurrenceEndDate);
      ret.push( this.toDhtmlxTask(child, firstResourceTag ? getTaskBackgroundColor(firstResourceTag) : undefined, order++, parentId, GanttConfig.recurrentTaskCssClass, true) );
    }

    return ret
  }

  protected selectView(view: "months" | "days" | "hours") {
    this.selectedView = view;
    switch( this.selectedView ){
      case "months":
        gantt.config.scales = [{
          unit: 'month',
          format: '%F'
        }]
        break
      case "days":
        gantt.config.scales = [{
          unit: 'month',
          format: '%F'
        },{
          unit: 'day',
          date: '%j'
        }]
        break;
      case "hours":
        gantt.config.scales = [{
          unit: 'month',
          format: '%F'
        },{
          unit: 'day',
          date: '%j'
        },{
          unit: 'hour',
          date: '%H'
        }]
        break;    
    }
    gantt.render()
  }

}
