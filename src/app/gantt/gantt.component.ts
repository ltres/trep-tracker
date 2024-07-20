import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import { DayDateString, ISODateString, Lane, Task } from '../../types/types';
import { generateUUID, getDayDate, getIsoString } from '../../utils/utils';
import { BoardService } from '../../service/board.service';
import { GanttStatic, Link } from 'dhtmlx-gantt';
import { gantt, Task as DhtmlxTask } from 'dhtmlx-gantt';

@Component({
  selector: 'gantt[lane][tasks]',
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss'
})
export class GanttComponent implements AfterViewInit {
  @Input() lane!: Lane;
  @Input() tasks!: Task[] | undefined | null;

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
      return "";
    };

    gantt.clearAll();
    gantt.parse(this.toDhtmlxGanttDataModel( this.tasks, {data: [], links: []} ));


    gantt.init("gantt");

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
    if (!toUpdate) {
      throw new Error('Task not found');
    }
    let changed = false;
    if (data.start_date && formatFunc(data.start_date) !== toUpdate.gantt!.startDate) {
      changed = true;
      toUpdate.gantt!.startDate = getIsoString(typeof data.start_date === 'string' ? formatFunc(data.start_date) : data.start_date);
    }
    if (data.end_date && formatFunc(data.end_date) !== toUpdate.gantt!.endDate ) {
      changed = true;
      toUpdate.gantt!.endDate = getIsoString(typeof data.end_date === 'string' ? formatFunc(data.end_date) : data.start_date);
    }

    if (data.text && data.text !== toUpdate.textContent) {
      changed = true;
      toUpdate.textContent = data.text;
    }
    if (changed) {
      this.boardService.publishBoardUpdate();
    }
  }
  createTask(data: DhtmlxTask) {
    throw new Error('Method not implemented.');
  }
  updateLink(data: Link) {
    throw new Error('Method not implemented.');
  }
  createLink(data: Link) {
    let parent = this.boardService.getTask(data.source.toString());
    let dest = this.boardService.getTask(data.target.toString());
    if(!parent || !dest){
      throw new Error('Task not found');
    }

    dest.gantt!.predecessors = dest.gantt!.predecessors ?? [];
    dest.gantt!.predecessors.push({
      laneId: this.lane.id,
      taskId: parent.id,
      linkId: data.id.toString()
    });
    this.boardService.publishBoardUpdate();
  }
  deleteLink(id: string) {
    this.boardService.allTasks?.forEach(task => {
      if(task.gantt?.predecessors){
        task.gantt.predecessors = task.gantt.predecessors.filter(p => p.linkId !== id);
      }
    });
    this.boardService.publishBoardUpdate();
  }

  toDhtmlxGanttDataModel(tasks: Task[], runningObject: { data: DhtmlxTask[], links: Link[], latestEndDate?: ISODateString}, parentId?: string ): { data: DhtmlxTask[], links: Link[] } {
    // remove duplicates:
    tasks = tasks.reduce((acc: Task[], task) => {
      if (!acc.find(t => t.id === task.id)) {
        acc.push(task);
      }
      return acc;
    }, []);

    let prevBase: Task | undefined;
    for (let task of tasks) {
      this.initGanttData(task, prevBase, runningObject.latestEndDate);
      //standard task
      let dhtmlxTask: DhtmlxTask = {
        id: task.id,
        text: task.textContent,
        type: task.children.length > 0 ? 'project' : 'task',
        start_date: new Date(task.gantt!.startDate),
        end_date: new Date(task.gantt!.endDate),
        parent: parentId,
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
      if(task.gantt?.predecessors){
        for(let pred of task.gantt.predecessors.filter( p => p.laneId === this.lane.id)){
          let link: Link = {
            id: pred.linkId,
            source: pred.taskId,
            target: task.id,
            editable: true,
            type: '0'
          }
          runningObject.links.push(link);
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
    let plusTwo = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + baseDuration);
    task.gantt = {
      startDate: task.gantt?.startDate ?? getIsoString(startDate),
      endDate: task.gantt?.endDate ?? getIsoString(plusTwo),
      predecessors: task.gantt?.predecessors ?? (previousTask ? [{
        laneId: this.lane.id,
        taskId: previousTask.id,
        linkId: generateUUID()
      }]: undefined)
    }


    return task;
  }

  log($event: any) {
    console.log($event);
  }

}
