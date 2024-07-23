import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import { DayDateString, ISODateString, Task } from '../../types/types';
import { generateUUID, getDayDate, getIsoString } from '../../utils/utils';
import { BoardService } from '../../service/board.service';
import { GanttStatic, Link } from 'dhtmlx-gantt';
import { gantt, Task as DhtmlxTask } from 'dhtmlx-gantt';

@Component({
  selector: 'gantt[tasks]',
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss'
})
export class GanttComponent implements AfterViewInit {
  @Input() tasks!: Task[] | undefined | null;
  fullDescendants: Task[] | undefined;

  constructor(protected boardService: BoardService) { }


  ngAfterViewInit(): void {
    if (!this.tasks) {
      throw new Error('Tasks must be defined');
    }
    // gantt.config.date_format = "%Y-%m-%d %H:%i";

    //gantt.config['scale_unit'] = "week";
    //antt.config['date_scale'] = "%F, %Y";
    let today = new Date();

    gantt.config.min_column_width = 30; // Set to your desired width in pixels
    gantt.plugins({
      multiselect: true,
      marker: true,
    });
    var dateToStr = gantt.date.date_to_str(gantt.config.task_date);

    gantt.addMarker({
      start_date: today,
      css: "today",
      text: "Today",
      title: "Today: " + dateToStr(today)
    });
    gantt.config.multiselect = true;
    gantt.config.multiselect_one_level = false;

    var start = new Date(today.getFullYear(), today.getMonth(), 0); // January 1, 2024
    var end = new Date(today.getFullYear(), today.getMonth() + 4, 0); // December 31, 2024
    gantt.config.work_time = true;
    gantt.setWorkTime({ hours: [9, 13, 14, 18] });//global working hours. 8:00-12:00, 13:00-17:00
    gantt.templates.timeline_cell_class = function (task, date) {
      if (!gantt.isWorkTime(date)) {
        return "gantt-weekend";
      }
      return "";
    };
    gantt.config.start_date = start;
    gantt.config.end_date = end;
    gantt.attachEvent("onBeforeTaskDelete", function (id, task) {
      gantt.message({ type: "error", text: "Cannot delete tasks from this view" });
      return false;
    });
    gantt.templates.task_class = function (start, end, task) {
      if (gantt.hasChild(task.id)) {
        return "gantt-parent-task";
      }
      if(task['css'])
      return task['css'];
    };
    gantt.config.order_branch = true;
    gantt.clearAll();
    this.fullDescendants = this.tasks.flatMap(task => this.boardService.getDescendants(task)).concat(this.tasks).filter( t => this.boardService.isTask(t)) as Task[];
    let dataModel = this.toDhtmlxGanttDataModel( this.tasks, {data: [], links: []} );
    dataModel.data = dataModel.data.sort((a, b) => a['order'] - b['order']);
    gantt.parse(dataModel);


    gantt.init("gantt");
    gantt.showDate(new Date());
    if (!(gantt as any).$_initOnce) {
      (gantt as any).$_initOnce = true;

      const dp = gantt.createDataProcessor({
        task: {
          update: (data: DhtmlxTask) => this.updateTask(data),
          create: (data: DhtmlxTask) => this.createTask(data),
          // delete: (id: string) => console.log(id),
        },
        link: {
          update: (data: Link) => this.updateLink(data),
          create: (data: Link) => this.createLink(data),
          delete: (id: string) => this.deleteLink(id),
        }
      });
    }
  }
  updateTask(data: DhtmlxTask) {
    var formatFunc = gantt.date.str_to_date("%dd-%mm-%YYYY hh:MM", true);
    let toUpdate = this.boardService.getTask(data.id.toString());
    if (!toUpdate || !toUpdate.gantt) {
      throw new Error('Task not found');
    }
    toUpdate.gantt.startDate = getIsoString(typeof data.start_date === 'string' ? formatFunc(data.start_date) : data.start_date);
    toUpdate.gantt.endDate = getIsoString(typeof data.end_date === 'string' ? formatFunc(data.end_date) : data.start_date);
    toUpdate.gantt.progress = data.progress ?? 0;
    toUpdate.textContent = data.text;
    toUpdate.gantt.duration = data.duration;

    let order = 0;
    gantt.eachTask((task) => {
      let toOrder = this.tasks!.find(t => t.id === task.id);
      if(!toOrder || !toOrder.gantt){
        console.warn('Task not found');
        return
      }
      if( toOrder.gantt.order && order === 0){
        order = toOrder.gantt.order;
      }
      toOrder.gantt.order = order++;
    });

    this.boardService.publishBoardUpdate();

  }
  createTask(data: DhtmlxTask) {
    throw new Error('Method not implemented.');
  }
  updateLink(data: Link) {
    throw new Error('Method not implemented.');
  }
  createLink(data: Link) {
    let source = this.boardService.getTask(data.source.toString());
    let target = this.boardService.getTask(data.target.toString());
    if(!source || !target){
      throw new Error('Task not found');
    }

    source.gantt!.successors = source.gantt!.successors ?? [];
    source.gantt!.successors.push({
      taskId: target.id,
      linkId: data.id.toString()
    });
    this.boardService.publishBoardUpdate();
  }
  deleteLink(id: string) {
    this.boardService.allTasks?.forEach(task => {
      if(task.gantt?.successors){
        task.gantt.successors = task.gantt.successors.filter(p => p.linkId !== id);
      }
    });
    this.boardService.publishBoardUpdate();
  }

  toDhtmlxGanttDataModel(tasks: Task[], runningObject: { data: DhtmlxTask[], links: Link[], latestEndDate?: ISODateString}, parentId?: string, cssClass?: string ): { data: DhtmlxTask[], links: Link[] } {
    
    // remove duplicates:
    tasks = tasks.reduce((acc: Task[], task) => {
      if (!acc.find(t => t.id === task.id) && !runningObject.data.find(t => t.id === task.id)) {
        acc.push(task);
      }
      return acc;
    }, []);

    let prevBase: Task | undefined;
    for (let task of tasks) {
      this.initGanttData(task, prevBase, runningObject.latestEndDate);
      //standard tas
      let dhtmlxTask: DhtmlxTask = {
        id: task.id,
        text: task.textContent,
        type: task.children.length > 0 ? 'project' : 'task',
        start_date: new Date(task.gantt!.startDate),
        end_date: new Date(task.gantt!.endDate),
        parent: parentId,
        progress: task.gantt?.progress ?? 0,
        css: cssClass,
        order: task.gantt?.order ?? 999,
        //auto_scheduling: true,
        open: true,
      }

      runningObject.latestEndDate = task.children.length > 0 ? runningObject.latestEndDate : task.gantt!.endDate;

      if(!parentId){
        delete dhtmlxTask.parent;
      }

      if (task.children.length > 0) {
        this.toDhtmlxGanttDataModel(task.children, runningObject, task.id );
      }

      runningObject.data.push(dhtmlxTask);

      // links
      if(task.gantt?.successors){
        for(let succ of task.gantt.successors){
          let link: Link = {
            id: succ.linkId,
            source: task.id,
            target: succ.taskId,
            editable: true,
            type: '0'
          }
          runningObject.links.push(link);
          // It may happen that a successor is not between the tasks or their descendants. We need to retrieve it and process it.
          if( this.fullDescendants && this.fullDescendants.map( t => t.id ).indexOf( succ.taskId ) < 0 ){
            let retrievedSucc = this.boardService.getTask(succ.taskId);
            if(!retrievedSucc){
              throw new Error('Task not found');
            }
            this.toDhtmlxGanttDataModel([retrievedSucc], runningObject, undefined, 'gantt-external-task' );
          }
        }
      }else{
        if (prevBase && 1 !== 1) {
          let link: Link = {
            id: generateUUID(),
            source: prevBase.id,
            target: task.id,
            editable: true,
            type: '0'
          }
          runningObject.links.push(link);
        }
      }
      prevBase = task;
    }

    return runningObject;
  }

  private initGanttData(task: Task, previousTask?: Task, latestEndDate?: ISODateString): Task {
    let baseDuration = 2;
    let startDate = new Date();
    if( previousTask && previousTask.gantt?.endDate && previousTask.children.length === 0){
      startDate = new Date(previousTask.gantt.endDate);
    }else if( latestEndDate ){
      startDate = new Date(latestEndDate);
    }
    if(startDate.getDay() == 6 || startDate.getDay() == 0){
      // weekend
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    let plusTwo = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + baseDuration);
    task.gantt = {
      startDate: task.gantt?.startDate ?? getIsoString(startDate),
      endDate: task.gantt?.endDate ?? getIsoString(plusTwo),
      progress: task.gantt?.progress ?? 0,
      successors: task.gantt?.successors ?? [],
      order: task.gantt?.order ?? 999
    }
    return task;
  }

  log($event: any) {
    console.log($event);
  }

}
