import { AfterViewInit, Component, Input } from '@angular/core';
import { ISODateString, Task } from '../../types/types';
import { generateUUID, getDescendants, getFirstMentionTag, getIsoString, isTask } from '../../utils/utils';
import { BoardService } from '../../service/board.service';
import { Link } from 'dhtmlx-gantt';
import { gantt, Task as DhtmlxTask } from 'dhtmlx-gantt';

@Component({
  selector: 'gantt[tasks]',
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss',
})
export class GanttComponent implements AfterViewInit {
  @Input() tasks!: Task[] | undefined | null;
  fullDescendants: Task[] | undefined;

  constructor(protected boardService: BoardService) { }

  ngAfterViewInit(): void {
    if (!this.tasks) {
      throw new Error('Tasks must be defined');
    }
    const today = new Date();
    
    gantt.plugins({
      multiselect: true,
      marker: true,
    });
    gantt.addMarker({
      start_date: today,
      css: 'today',
      text: 'Today',
      title: 'Today',
    });
    gantt.addMarker({
      start_date: new Date(2024,7,1),
      css: 'aug',
      text: 'aug',
      title: 'aug',
    });
    gantt.config['scale_unit'] = 'month';
    gantt.config['date_scale'] = '%F'; // Full month name
    gantt.config['subscales'] = [
      { unit: 'day', step: 1, date: '%j' }, // Day of the month as number
    ];
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
      { name: 'text', label: 'Task name', min_width: 300, width: '*', tree: true },
      { name: 'start_date', label: 'Start time', align: 'center' },
      { name: 'duration', label: 'Duration', align: 'center' },
    ];
    gantt.config.sort = true;

    const start = new Date(today.getFullYear(), today.getMonth(), 0);
    const end = new Date(today.getFullYear(), today.getMonth() + 4, 0);

    gantt.config.work_time = true;
    gantt.setWorkTime({ hours: [9, 13, 14, 18] });//global working hours. 8:00-12:00, 13:00-17:00
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

    gantt.config.order_branch = true;
    gantt.clearAll();
    this.fullDescendants = this.tasks.flatMap(task => getDescendants(task)).concat(this.tasks).filter(t => isTask(t)) as Task[];
    const dataModel = this.toDhtmlxGanttDataModel(this.tasks, { data: [], links: [] });
    dataModel.data = dataModel.data.sort((a, b) => a['order'] - b['order']);
    gantt.parse(dataModel);

    gantt.init('gantt');
    gantt.showDate(today);
     
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
          create: (data: Link) => this.createLink(data),
          delete: (id: string) => this.deleteLink(id),
        },
      });
    }
  }
  updateTask(data: DhtmlxTask) {
    const formatFunc = gantt.date.str_to_date('%dd-%mm-%YYYY hh:MM', true);
    const toUpdate = this.boardService.getTask(data.id.toString());
    if (!toUpdate || !toUpdate.gantt) {
      console.log('Task ' + toUpdate?.id + 'not found');
    } else {
      toUpdate.gantt.startDate = getIsoString(typeof data.start_date === 'string' ? formatFunc(data.start_date) : data.start_date);
      toUpdate.gantt.endDate = getIsoString(typeof data.end_date === 'string' ? formatFunc(data.end_date) : data.start_date);
      toUpdate.gantt.progress = data.progress ?? 0;
      toUpdate.textContent = data.text;
      toUpdate.gantt.duration = data.duration;
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

  }
  createTask() {
    throw new Error('Method not implemented.');
  }
  updateLink() {
    throw new Error('Method not implemented.');
  }
  createLink(data: Link) {
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

  toDhtmlxGanttDataModel(tasks: Task[], runningObject: { data: DhtmlxTask[], links: Link[], latestEndDate?: ISODateString }, parentId?: string, cssClass?: string): { data: DhtmlxTask[], links: Link[] } {

    // remove duplicates:
    tasks = tasks.reduce((acc: Task[], task) => {
      if (!acc.find(t => t.id === task.id) && !runningObject.data.find(t => t.id === task.id)) {
        acc.push(task);
      }
      return acc;
    }, []);

    let prevBase: Task | undefined;
    for (const task of tasks) {
      this.initGanttData(task, prevBase, runningObject.latestEndDate);
      const resourceTag = task.tags?.find(t => t.type === 'tag-orange')?.tag;
      //standard task
      const dhtmlxTask: DhtmlxTask = {
        id: task.id,
        text: task.textContent,
        type: task.children.length > 0 ? 'project' : 'task',
        start_date: new Date(task.gantt!.startDate),
        end_date: new Date(task.gantt!.endDate),
        parent: parentId,
        progress: task.gantt?.progress ?? 0,
        css: cssClass,
        color: resourceTag ? `hsl(${this.textToNumber(resourceTag,357)}, 50%, 40%, 0.6)` : undefined,
        order: task.gantt?.order ?? 999,
        mention: getFirstMentionTag(task),
        //auto_scheduling: true,
        open: true,
      };

      runningObject.latestEndDate = task.children.length > 0 ? runningObject.latestEndDate : task.gantt!.endDate;

      if (!parentId) {
        delete dhtmlxTask.parent;
      }

      if (task.children.length > 0) {
        this.toDhtmlxGanttDataModel(task.children, runningObject, task.id);
      }

      runningObject.data.push(dhtmlxTask);

      // links
      if (task.gantt?.successors) {
        for (const succ of task.gantt.successors) {
          const link: Link = {
            id: succ.linkId,
            source: task.id,
            target: succ.taskId,
            editable: true,
            type: '0',
          };
          runningObject.links.push(link);
          // It may happen that a successor is not between the tasks or their descendants. We need to retrieve it and process it.
          if (this.fullDescendants && this.fullDescendants.map(t => t.id).indexOf(succ.taskId) < 0) {
            const retrievedSucc = this.boardService.getTask(succ.taskId);
            if (!retrievedSucc) {
              console.error('Task ' + succ.taskId + ' not found');
            } else {
              // this.tasks?.push(retrievedSucc);
              this.toDhtmlxGanttDataModel([retrievedSucc], runningObject, undefined, 'gantt-external-task');
            }
          }
        }
      } else {
        if (prevBase && 1 !== 1) {
          const link: Link = {
            id: generateUUID(),
            source: prevBase.id,
            target: task.id,
            editable: true,
            type: '0',
          };
          runningObject.links.push(link);
        }
      }
      prevBase = task;
    }

    return runningObject;
  }

  private textToHexColor(text: string): string {
    let hash = 0;

    // Generate a hash from the input text
    for (let i = 0; i < text.length; i++) {
      const charCode = text.toLowerCase().charCodeAt(i);
      hash = (hash * 31 + charCode) % 0xFFFFFF;
    }

    // Extract RGB components from the hash
    const r = (hash >> 16) & 0xFF;
    const g = (hash >> 8) & 0xFF;
    const b = hash & 0xFF;

    // Convert RGB components to HEX string
    const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    return hexColor;
  }

  private textToNumber(text: string, to?: number): number {
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      const charCode = text.toLowerCase().charCodeAt(i);
      hash = (hash * 31 + charCode) % (to ?? 256);
    }

    return hash;
  }

  private initGanttData(task: Task, previousTask?: Task, latestEndDate?: ISODateString): Task {
    const baseDuration = 2;
    let startDate = new Date();
    if (previousTask && previousTask.gantt?.endDate && previousTask.children.length === 0) {
      startDate = new Date(previousTask.gantt.endDate);
    } else if (latestEndDate) {
      startDate = new Date(latestEndDate);
    }
    if (startDate.getDay() == 6 || startDate.getDay() == 0) {
      // weekend
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    const plusTwo = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + baseDuration);
    task.gantt = {
      startDate: task.gantt?.startDate ?? getIsoString(startDate),
      endDate: task.gantt?.endDate ?? getIsoString(plusTwo),
      progress: task.gantt?.progress ?? 0,
      successors: task.gantt?.successors ?? [],
      order: task.gantt?.order ?? 999,
    };
    return task;
  }

}
