import { AfterViewInit, Component, Input } from '@angular/core';
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
  @Input() tasks!: Task[];

  gantt: GanttStatic | undefined;

  taskz = [
    {
      id: 'Task 1',
      name: 'Redesign website',
      start: '2016-12-28',
      end: '2016-12-31',
      progress: 20,
      dependencies: '',
      custom_class: 'bar-milestone' // optional
    },
    {
      id: 'Task 2',
      name: 'Redesign website',
      start: '2016-12-28',
      end: '2016-12-31',
      progress: 20,
      dependencies: 'Task 1',
      custom_class: 'bar-milestone' // optional
    },

    {
      id: 'Task 3',
      name: 'Redesign website',
      start: '2016-12-28',
      end: '2016-12-31',
      progress: 20,
      dependencies: 'Task 1',
      custom_class: 'bar-milestone' // optional
    }
  ]

  constructor(protected boardService: BoardService) { }

  ngAfterViewInit(): void {
    // gantt.config.date_format = "%Y-%m-%d %H:%i";

    //gantt.config['scale_unit'] = "week";
    //antt.config['date_scale'] = "%F, %Y";
    let today = new Date();


    var start = new Date(today.getFullYear(), today.getMonth(), 0); // January 1, 2024
    var end = new Date(today.getFullYear(), today.getMonth() + 2, 0); // December 31, 2024
    gantt.config.work_time = true;
    gantt.setWorkTime({ hours: [9, 13, 14, 18] });//global working hours. 8:00-12:00, 13:00-17:00

    gantt.config.start_date = start;
    gantt.config.end_date = end;


    gantt.init("gantt");
    gantt.parse(this.toDhtmlxGanttDataModel(this.tasks));

    if (!(gantt as any).$_initOnce) {
      (gantt as any).$_initOnce = true;

      const dp = gantt.createDataProcessor({
        task: {
          update: (data: Task) => console.log(data),
          create: (data: Task) => console.log(data),
          delete: (id: any) => console.log(id),
        },
        link: {
          update: (data: Link) => console.log(data),
          create: (data: Link) => console.log(data),
          delete: (id: any) => console.log(id),
        }
      });
    }
  }

  toDhtmlxGanttDataModel(tasks: Task[]): { data: DhtmlxTask[], links: Link[] } {
    let reTasks: DhtmlxTask[] = [];
    let reLinks: Link[] = [];

    let prevBase: Task | undefined;
    for (let task of tasks) {
      if (task.children && task.children.length > 0) {
        //Project task
        let dhtmlxTask: DhtmlxTask = {
          id: task.id,
          text: task.textContent,
          editable: true,
          //start_date: task.gantt ? new Date(task.gantt?.start) : undefined,
          //end_date: task.gantt ? new Date(task.gantt?.end) : undefined,

          //duration: undefined,
          open: true
        }
        reTasks.push(dhtmlxTask);
        if (prevBase) {
          let link: Link = {
            id: generateUUID(),
            source: prevBase.id,
            target: task.id,
            type: '0'
          }
          reLinks.push(link);
        }
        if (true) {
          let prevChild: Task | undefined;
          this.boardService.getDescendants(task).forEach(child => {
            if (!this.boardService.isTask(child)) return;
            if (!child.gantt) {
              child.gantt = {
                start: getIsoString(new Date()),
                end: getIsoString(new Date())
              }
            }

            let dhtmlxTask: DhtmlxTask = {
              id: child.id,
              text: child.textContent,
              start_date: new Date(child.gantt.start),
              end_date: new Date(child.gantt.start),
              editable: true,
              parent: task.id,
            }
            reTasks.push(dhtmlxTask);
            if (prevChild) {
              let link: Link = {
                id: generateUUID(),
                source: prevChild.id,
                target: child.id,
                type: '0'
              }
              reLinks.push(link);
            }
            prevChild = child;
          });
        }

      } else {
        //standard task
        let dhtmlxTask: DhtmlxTask = {
          id: task.id,
          text: task.textContent,
          start_date: task.gantt ? new Date(task.gantt?.start) : undefined,
          end_date: task.gantt ? new Date(task.gantt?.end) : undefined,
        }
        reTasks.push(dhtmlxTask);
        if (prevBase) {
          let link: Link = {
            id: generateUUID(),
            source: prevBase.id,
            target: task.id,
            editable: true,
            type: '0'
          }
          reLinks.push(link);
        }
      }

      prevBase = task;
    }

    return {
      data: reTasks,
      links: reLinks
    }
  }

  log($event: any) {
    console.log($event);
  }

  getTaskGanttDate(task: Task, dateKey: "start" | 'end'): DayDateString {
    if (!task.gantt) {
      task.gantt = {
        start: getIsoString(new Date()),
        end: getIsoString(new Date())
      }
    }
    let d = task.gantt[dateKey];
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
