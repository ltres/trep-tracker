import{ AfterViewInit, ApplicationRef, Component, createComponent, Input, OnDestroy }from'@angular/core';
import{ Board, GanttTask, Lane, Task }from'../../types/types';
import{ BoardService }from'../../service/board.service';
import{ gantt, Task as DhtmlxTask, GanttStatic, Link as DhtmlxLink }from'dhtmlx-gantt';
import{ TaskComponent }from'../task/task.component';
import{ toIsoString, ganttDateToDate, formatDate }from'../../utils/date-utils';
import{ getFirstMentionTag, initGanttData, getTaskBackgroundColor }from'../../utils/utils';
import{  ganttConfig, tagTypes }from'../../types/constants';
import{ assertIsGanttTask, isRecurringTask }from'../../utils/guards';
import{ ChangePublisherService }from'../../service/change-publisher.service';

@Component( {
  selector: 'gantt[tasks][board]',
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss',
} )
export class GanttComponent implements AfterViewInit, OnDestroy{
  @Input() tasks: Task[] | undefined | null;
  @Input() lane: Lane | undefined;
  @Input() board! : Board;

  today = new Date();
  shownDate: Date | undefined = this.today;

  selectedView: "months" | "days" | "hours" = 'days'
  dp: {destructor: () => unknown} | undefined; // data processor
  
  constructor(
    protected changePublisherService: ChangePublisherService,

    protected boardService: BoardService,
    protected applicationRef: ApplicationRef
  ){ }

  ngAfterViewInit(): void{
    this.setupGantt( gantt );

    this.init();
  }

  ngOnDestroy(): void{
    this.dp?.destructor();
  }

  private init(){
    if( !this.tasks ){
      throw new Error( 'Tasks must be defined to open gantt' );
    }

    /** Exclude tasks having showData = false */
    this.tasks = this.tasks.filter( t => !t.gantt || t.gantt.showData !== false ).sort( ( t1, t2 ) => {
      if( !this.lane ){
        // Gantt for board
        return( t1.gantt?.order?.board ?? 0 ) - ( t2.gantt?.order?.board ?? 0 )
      }else{
        // Gantt for a lane
        return( t1.gantt?.order?.[this.lane?.id] ?? 0 ) - ( t2.gantt?.order?.[this.lane?.id] ?? 0 )
      }
    } )

    gantt.clearAll();

    /** Convert the local datamodel to the one gantt requires */
    const dataModel = this.toDhtmlxGanttDataModel( this.tasks, [], [], undefined, undefined );

    /** Initial task sort */
    dataModel.convertedTasks = dataModel.convertedTasks.sort( ( a, b ) => a['order'] - b['order'] );

    gantt.parse( {data:dataModel.convertedTasks, links: dataModel.convertedLinks} );

    gantt.init( 'gantt' );

    this.ganttAfterInitOperations( gantt )
  }

  /**
   * Called from the gantt when a task gets modified via the GUI
   */
  updateTask( data: DhtmlxTask ){
    const t = this.boardService.getTask( data.id.toString() );
    if( !t ){
      console.log( 'Task ' + data.id + 'not found' );
      return;
    }

    if( !t.gantt ){
      initGanttData( t, new Date() );
    }

    assertIsGanttTask( t )

    if( data.start_date && data.end_date ){
      this.boardService.setTaskDates( t, ganttDateToDate( data.start_date as unknown as string ), ganttDateToDate( data.end_date as unknown as string ) )

    }
    t.gantt.progress = data.progress ?? 0;
    t.textContent = data.text;

    // Order is for each lane, or for the whole board:
    let order = 0;
    gantt.eachTask( ( task: DhtmlxTask ) => {
      if( task['isRecurrenceStep'] ){
        return;
      }
      const toOrder = this.boardService.getTask( task.id.toString() );
      if( !toOrder || !toOrder.gantt ){
        console.warn( 'Task not found' );
        return;
      }
      if( !toOrder.gantt.order ){
        toOrder.gantt.order = {};
      }

      if( !this.lane ){
        // gantt is drawn on a board
        toOrder.gantt.order!.board = order++
      }else{
        // gantt for a lane
        toOrder.gantt.order![this.lane.id] = order++
      }
    } );

    this.changePublisherService.processChangesAndPublishUpdate( [t] );

    /*
    if( isRecurringTask(toUpdate) ){
      // A recurrence step has been modified. We should redraw the related recurrences:
      const newRecurrences = this.generateCenteredRecurrences( toUpdate, 0, data.parent?.toString() )
      
      newRecurrences.forEach((rec) => {
        const t = gantt.getTask(rec.id);
        t.start_date = rec.start_date;
        t.end_date = rec.end_date;
        gantt.updateTask(rec.id); //renders the updated task
      });
    }
    */

  }
  createTask(){
    throw new Error( 'Method not implemented.' );
  }
  updateLink(){
    throw new Error( 'Method not implemented.' );
  }
  createLink( data: DhtmlxLink ){
    const start = gantt.getTask( data.source.toString() );
    const end = gantt.getTask( data.target.toString() )

    if( start['isRecurrenceStep'] || end['isRecurrenceStep'] ){
      console.warn( "cannot create links for recurrent tasks" );
      return;
    }
    const source = this.boardService.getTask( data.source.toString() );
    const target = this.boardService.getTask( data.target.toString() );
    if( !source || !target ){
      throw new Error( 'Task not found' );
    }

    source.gantt!.successors = source.gantt!.successors ?? [];
    if( source.gantt!.successors.find( l => l.taskId === target.id ) ){
      return;
    }
    source.gantt!.successors.push( {
      taskId: target.id,
      linkId: data.id.toString(),
    } );
    this.changePublisherService.processChangesAndPublishUpdate( [source, target] );

  }
  deleteLink( id: string ){
    this.boardService.allTasks?.forEach( task => {
      if( task.gantt?.successors ){
        task.gantt.successors = task.gantt.successors.filter( p => p.linkId !== id );
        this.changePublisherService.processChangesAndPublishUpdate( [task] );
      }
    } );
    
  }

  private toDhtmlxGanttDataModel( tasks: Task[], convertedTasks: DhtmlxTask[], convertedLinks: DhtmlxLink[], parentId: string | undefined, tasksCssClass: string | undefined ): { convertedTasks: DhtmlxTask[], convertedLinks: DhtmlxLink[] }{

    let order = convertedTasks.length;

    for( const task of tasks ){
      if( convertedTasks.find( t => t.id === task.id ) ){
        continue;
      }
      const lastDateInConverted = convertedTasks[convertedTasks.length-1]?.end_date ?? new Date();

      // Init the gantt data and convert
      const initializedTask = initGanttData( task, lastDateInConverted );
      const firstResourceTag = task.tags?.find( t => t.type === tagTypes.tagOrange )?.tag;
      const dhtmlxTask = this.toDhtmlxTask( initializedTask, firstResourceTag ? getTaskBackgroundColor( firstResourceTag ) : undefined, order++, parentId, tasksCssClass, false, undefined );
      convertedTasks.push( dhtmlxTask );
      
      if( isRecurringTask( initializedTask ) && task.recurrences ){
        // Task has recurrence. Retrieve its recurrences.
        //this.toDhtmlxGanttDataModel(task.recurrences, convertedTasks, convertedLinks, initializedTask.id, tasksCssClass );
        
        const recs = task.recurrences?.map( ( r, i ) => this.toDhtmlxTask( r, firstResourceTag ? getTaskBackgroundColor( firstResourceTag ) : undefined, order++, task.id, tasksCssClass, true, i ) ) ?? [];
        convertedTasks = convertedTasks.concat( recs ); 
      }
      
      if( task.children.length > 0 ){
        this.toDhtmlxGanttDataModel( task.children, convertedTasks, convertedLinks, task.id, tasksCssClass );
      }

      // Build task links
      if( task.gantt?.successors ){
        for( const successor of task.gantt.successors ){
          const link: DhtmlxLink = {
            id: successor.linkId,
            source: task.id,
            target: successor.taskId,
            editable: true,
            type: '0',
          };
          convertedLinks.push( link );
          // It may happen that a successor is not between the tasks or their descendants. We need to retrieve it and process it.
          if( tasks.map( t => t.id ).indexOf( successor.taskId ) < 0 ){
            const retrievedSucc = this.boardService.getTask( successor.taskId );
            if( !retrievedSucc ){
              console.error( 'Task ' + successor.taskId + ' not found' );
            }else{
              this.toDhtmlxGanttDataModel( [retrievedSucc], convertedTasks, convertedLinks, task.id, ganttConfig.externalTaskCssClass );
            }
          }
        }
      }
    }

    return{convertedTasks, convertedLinks};
  }

  /**
   * Configures the gantt object
   */
  private setupGantt( gantt: GanttStatic ){
    
    gantt.plugins( {
      multiselect: true,
      marker: true,
    } );

    this.selectView( this.selectedView );

    gantt.config.min_column_width = 25; // Set to your desired width in pixels

    gantt.config.multiselect = true;
    gantt.config.multiselect_one_level = false;
    // default columns definition

    gantt.config.columns = [
      {
        name: 'mention',
        label: 'Mention',
        width: 80,
        template: ( task ) => {
          return task['mention'];
        },
        sort: function( a, b ){
          const cmp = a['mention']?.toLowerCase().localeCompare( b['mention']?.toLowerCase() );
          if( cmp !== 0 ){
            return cmp;
          }
          return( a.start_date?.getTime() ?? 0 ) - ( b.start_date?.getTime() ?? 0 );
        },
      },
      { name: 'text', label: 'Task name', width: '*', tree: true, 
        template: ( task ) =>{
          return this.getTaskComponentHTML( task );
        } },
      { name: 'start_date', label: 'Starts', align: 'center',  width: 100, template: ( task ) => {
        if( !task.start_date )return;
        return`<span class="${ task['isRecurrenceStep'] ? 'translucent' : "" }">${formatDate( toIsoString( task.start_date ), this.board.datesConfig )}</span>`;
      } },
      { name: 'duration', label: 'Duration', align: 'center',  width: 50, },
    ];

    gantt.config.grid_width = ganttConfig.columnsWidth;

    gantt.templates.grid_file = function(){
      return"";
    };
    gantt.config.sort = true;

    const start = new Date( Date.UTC( this.today.getUTCFullYear(), this.today.getUTCMonth(), 0 ) );
    const end = new Date( Date.UTC( this.today.getUTCFullYear(), this.today.getUTCMonth() + ganttConfig.shownMonths, 0 ) );

    gantt.config.work_time = true;
    gantt.setWorkTime( { hours: [`${ganttConfig.startOfDay}:00-${ganttConfig.endOfDay}:00`] } );//global working hours. 8:00-12:00, 13:00-17:00
    gantt.templates.timeline_cell_class = function( task, date ){
      if( !gantt.isWorkTime( date ) ){
        return'gantt-weekend';
      }
      return'';
    };
    gantt.config.start_date = start;
    gantt.config.end_date = end;

    // Prevents task deleting
    gantt.attachEvent( 'onBeforeTaskDelete', function(){
      gantt.message( { type: 'error', text: 'Cannot delete tasks from this view' } );
      return false;
    } );

    // Prevents links to recurrence asteps
    gantt.attachEvent( "onBeforeLinkAdd", function( id, link ){
      const sourceTask = gantt.getTask( link.source );
      const targetTask = gantt.getTask( link.target );
      if( sourceTask['isRecurrenceStep'] || targetTask['isRecurrenceStep'] ){
        return false;
      }
      return true;
      
    } );

    gantt.templates.task_class = function( start, end, task ){
      if( gantt.hasChild( task.id ) ){
        return'gantt-parent-task';
      }
      if( task['css'] ){
        return task['css'];
      }
    };
    gantt.templates.task_row_class = function( start, end, task ){
      if( task['isRecurrenceStep'] === true || task['isRecurrenceStep'] === "highlighted" ){
        return"recurrent-task-row";
      }else if( task['isRecurrenceStep'] === "last" ){
        return"recurrent-task-row last";
      }
      if( task['hasRecurrence'] ){
        return"has-recurrence-task-row";
      }

      return"";
    };

    gantt.templates.grid_row_class = function( start, end, task ){
      if( task['isRecurrenceStep'] === true || task['isRecurrenceStep'] === "highlighted" ){
        return"recurrent-task-row";
      }else if( task['isRecurrenceStep'] === "last" ){
        return"recurrent-task-row last";
      }
      if( task['hasRecurrence'] ){
        return"has-recurrence-task-row";
      }
      return"";
    };

    gantt.config.order_branch = true;
    gantt.config.date_format = "%Y-%m-%d %H:%i";

  }

  /**
   * Performs after init operations and attaches update listeners for tasks and links
   */
  private ganttAfterInitOperations( gantt: GanttStatic ){
    gantt.showDate( this.shownDate ?? this.today );
      
    gantt.addMarker( { 
      start_date: new Date(), 
      css: "today", 
      title:"Today"
    } );

    this.dp = gantt.createDataProcessor( {
      task: {
        update: ( data: DhtmlxTask ) => this.updateTask( data ),
        create: () => this.createTask(),
        // delete: (id: string) => console.log(id),
      },
      link: {
        update: () => this.updateLink(),
        create: ( data: DhtmlxLink ) => this.createLink( data ),
        delete: ( id: string ) => this.deleteLink( id ),
      },
    } );
    
  }

  /**
   * Converts a local task to a DHX task
   */
  private toDhtmlxTask( task:GanttTask, color: string | undefined, order: number, parentId: string | undefined, cssClass: string | undefined, isRecurrenceStep: boolean, recurrenceIndex: number | undefined ): DhtmlxTask{
    const isProject = task.children.length > 0; 
    const isRecurrentTask = isRecurringTask( task ); 

    const dhtmlxTask: DhtmlxTask = {
      id: task.id,
      text: task.textContent,
      type: isProject || isRecurrentTask ? 'project' : 'task',
      start_date: isProject || isRecurrentTask ? undefined : new Date( task.gantt.startDate ),
      end_date:  isProject || isRecurrentTask ? undefined : new Date( task.gantt.endDate ),
      parent: parentId,
      progress: task.gantt?.progress ?? 0,
      css: cssClass,
      row_height: ganttConfig.recurrentTaskHeight,
      bar_height:  ganttConfig.recurrentTaskHeight,
      color,
      order: order,
      mention: getFirstMentionTag( task ),
      //hasRecurrence: task.gantt.recurrence,
      //isRecurrenceStep: isRecurrenceStep,
      //readonly: !!isRecurrenceStep,
      open: true,
      recurrenceIndex,
      trepTask: task
    };
    if( !parentId ){
      delete dhtmlxTask.parent
    }
    return dhtmlxTask;
  }

  /**
   *  Returns the html for a task using the TaskComponent 
   */
  private getTaskComponentHTML( task: DhtmlxTask ): string{
    if( task['isRecurrenceStep'] ){
      return""
    }
    const component = createComponent( TaskComponent, {environmentInjector: this.applicationRef.injector} )
    const t = task['trepTask'] as GanttTask;
    if( !t ){
      // may be a recurrence
      throw new Error( "Task not found" );
    }
    component.instance.task = t;
    component.instance.staticView = true;
    const l = this.boardService.findParentLane( [t] );
    if( l ){
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

  protected selectView( view: "months" | "days" | "hours" ){
    this.selectedView = view;
    switch( this.selectedView ){
      case"months":
        gantt.config.scales = [{
          unit: 'month',
          format: '%F'
        }]
        break
      case"days":
        gantt.config.scales = [{
          unit: 'month',
          format: '%F'
        }, {
          unit: 'day',
          date: '%j'
        }]
        break;
      case"hours":
        gantt.config.scales = [{
          unit: 'month',
          format: '%F'
        }, {
          unit: 'day',
          date: '%j'
        }, {
          unit: 'hour',
          date: '%H'
        }]
        break;    
    }
    gantt.render()
  }

}
