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
      multiselect: true
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
    gantt.parse(this.toDhtmlxGanttDataModel(this.tasks));


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
    if (data.start_date) {
      changed = true;
      toUpdate.gantt!.start = getIsoString(typeof data.start_date === 'string' ? formatFunc(data.start_date) : data.start_date);
    }
    if (data.end_date) {
      changed = true;
      toUpdate.gantt!.end = getIsoString(typeof data.end_date === 'string' ? formatFunc(data.end_date) : data.start_date);
    }
    if (data.text) {
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
    throw new Error('Method not implemented.');
  }
  deleteLink(id: string) {
    throw new Error('Method not implemented.');
  }

  toDhtmlxGanttDataModel(tasks: Task[], cur?: { data: DhtmlxTask[], links: Link[] }, parentId?: string): { data: DhtmlxTask[], links: Link[] } {
    // remove duplicates:
    tasks = tasks.reduce((acc: Task[], task) => {
      if (!acc.find(t => t.id === task.id)) {
        acc.push(task);
      }
      return acc;
    }, []);
    let ret: {
      data: DhtmlxTask[],
      links: Link[]
    } = cur ?? { data: [], links: [] };

    let prevBase: Task | undefined;
    for (let task of tasks) {
      this.initGanttDates(task, prevBase);
      //standard task
      let dhtmlxTask: DhtmlxTask = {
        id: task.id,
        text: task.textContent,
        start_date: task.children.length > 0 ? undefined : new Date(task.gantt!.start),
        end_date: task.children.length > 0 ? undefined : new Date(task.gantt!.end),
        parent: parentId,
        open: true,
      }
      if(!parentId){
        delete dhtmlxTask.parent;
      }

      if (task.children.length > 0) {
        this.toDhtmlxGanttDataModel(task.children, ret, task.id);
      }

      ret.data.push(dhtmlxTask);
      if (prevBase) {
        let link: Link = {
          id: generateUUID(),
          source: prevBase.id,
          target: task.id,
          editable: true,
          type: '0'
        }
        ret.links.push(link);
      }
      prevBase = task;
    }

    return ret;
  }

  private initGanttDates(task: Task, previousTask?: Task): Task {
    if (!task.gantt) {
      let date = previousTask && previousTask.gantt?.end ? new Date(previousTask.gantt.end) : new Date();
      let plusTwo = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2);
      task.gantt = {
        start: getIsoString(date),
        end: getIsoString(plusTwo)
      }
    }
    return task;
  }

  log($event: any) {
    console.log($event);
  }

  getTaskGanttDate(task: Task, dateKey: "start" | 'end'): DayDateString {
    this.initGanttDates(task);
    let d = task.gantt![dateKey];
    return getDayDate(new Date(d));
  }

  setTaskGanttDate(task: Task, dateKey: "start" | 'end', date: DayDateString) { // dd-mm-yyyy
    if (!task.gantt) {
      task.gantt = {
        start: getIsoString(new Date()),
        end: getIsoString(new Date())
      }
    }
    const [day, month, year] = date.split('-');
    let newDate = new Date(Number(year), Number(month) - 1, Number(day));
    if (getDayDate(newDate) === getDayDate(new Date(task.gantt[dateKey]))) {
      return;
    }
    task.gantt[dateKey] = getIsoString(newDate);
    this.boardService.publishBoardUpdate();
  }



}
