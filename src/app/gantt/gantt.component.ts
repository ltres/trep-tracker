import { AfterViewInit, Component, Input } from '@angular/core';
import { DayDateString, ISODateString, Lane, Task } from '../../types/task';
import { getDayDate, getIsoString } from '../../utils/utils';
import { BoardService } from '../../service/board.service';
import { GanttStatic, Link } from 'dhtmlx-gantt';
import { gantt } from 'dhtmlx-gantt';

@Component({
  selector: 'gantt[lane][tasks]',
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss'
})
export class GanttComponent implements AfterViewInit{
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
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.init("gantt");
    gantt.parse({
      data: [
        {id: 1, text: "Project #1", start_date: null, duration: null, parent:0, progress: 0, open: true},
        {id: 2, text: "Task #1", start_date: "2019-08-01 00:00", duration:5, parent:1, progress: 1},
        {id: 3, text: "Task #2", start_date: "2019-08-06 00:00", duration:2, parent:1, progress: 0.5},
        {id: 4, text: "Task #3", start_date: null, duration: null, parent:1, progress: 0.8, open: true},
        {id: 5, text: "Task #3.1", start_date: "2019-08-09 00:00", duration:2, parent:4, progress: 0.2},
        {id: 6, text: "Task #3.2", start_date: "2019-08-11 00:00", duration:1, parent:4, progress: 0}
      ],
      links:[
        {id:1, source:2, target:3, type:"0"},
        {id:2, source:3, target:4, type:"0"},
        {id:3, source:5, target:6, type:"0"}
      ]
    });

    if(!(gantt as any).$_initOnce){
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

  log($event: any) {
    console.log($event);
  }

  getTaskGanttDate(task: Task, dateKey: "start" | 'end'): DayDateString {
    if(!task.gantt) {
      task.gantt = {
        start: getIsoString(new Date()),
        end: getIsoString(new Date())
      }    
    }
    let d = task.gantt[dateKey];
    return getDayDate(new Date(d));
  }

  setTaskGanttDate(task: Task, dateKey: "start" | 'end', date: DayDateString) { // dd-mm-yyyy
    if(!task.gantt) {
      task.gantt = {
        start: getIsoString(new Date()),
        end: getIsoString(new Date())
      }    
    }
    const [day, month, year] = date.split('-');
    let newDate = new Date(Number(year), Number(month)-1, Number(day));
    if( getDayDate(newDate) === getDayDate( new Date(task.gantt[dateKey])) ){
      return;
    }
    task.gantt[dateKey] = getIsoString(newDate);
    this.boardService.publishBoardUpdate();
  }
    
}
