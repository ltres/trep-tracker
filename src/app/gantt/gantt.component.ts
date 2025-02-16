import{ AfterViewInit, ApplicationRef, Component, createComponent, Input, OnDestroy }from'@angular/core';
import{ Board, TimedTask, Lane, Task }from'../../types/types';
import{ BoardService }from'../../service/board.service';
import{ gantt, Task as DhtmlxTask, GanttStatic, Link as DhtmlxLink }from'dhtmlx-gantt';
import{ TaskComponent }from'../task/task.component';
import{ calculateWorkingHoursDuration, ganttDateToDate, toIsoString }from'../../utils/date-utils';
import{ getFirstMentionTag, initTimeData, getTaskBackgroundColor }from'../../utils/utils';
import{  ganttConfig, tagTypes }from'../../types/constants';
import{ assertIsTimedTask, isFixedTimedTask, isRollingTimedTask }from'../../utils/guards';
import{ ChangePublisherService }from'../../service/change-publisher.service';

@Component( {
  selector: 'gantt[lane][board]',
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss',
} )
export class GanttComponent implements AfterViewInit, OnDestroy{
  @Input() lane!: Lane;
  @Input() board! : Board;

  tasks: Task[] | undefined;

  today = new Date();
  shownDate: Date | undefined = this.today;

  selectedView: "months" | "days" | "hours" = 'days'
  dp: {destructor: () => unknown} | undefined; // data processor
  
  lastUpdatedTasks: string[] = []

  constructor(
    protected changePublisherService: ChangePublisherService,

    protected boardService: BoardService,
    protected applicationRef: ApplicationRef
  ){ }

  ngAfterViewInit(): void{
    this.setupGantt( gantt );

    setTimeout( () => {
      this.init( this.lane.children )

    }, 1000 )

    this.changePublisherService.pushedChanges$.subscribe( c => {
      if( c.map( co => co.id ).includes( this.lane?.id ) ){
        this.init( this.lane.children )
      }
    } )
  }

  ngOnDestroy(): void{
    this.dp?.destructor();
  }

  private init( tasks:Task[] ){
    if( !tasks ){
      throw new Error( 'Tasks must be defined to open gantt' );
    }

    /** Exclude tasks having showData = false */
    //tasks = tasks.filter( t => isTimedTask( t ) );

    gantt.clearAll();

    /** Convert the local datamodel to the one gantt requires */
    const dataModel = this.toDhtmlxGanttDataModel( tasks, [], [], undefined, undefined );

    /** Initial task sort */
    //dataModel.convertedTasks = dataModel.convertedTasks;

    gantt.parse( {data:dataModel.convertedTasks, links: dataModel.convertedLinks} );

    gantt.init( 'gantt' );

    this.ganttAfterInitOperations( gantt )
  }

  /**
   * Called from the gantt when a task gets modified via the GUI
   */
  updateTask( data: DhtmlxTask ){
    if( this.lastUpdatedTasks.includes( data.id + "" ) ){
      return;
    }
    this.lastUpdatedTasks.push( data.id + "" )

    const t = this.boardService.getTask( data.id.toString() );
    if( !t ){
      console.log( 'Task ' + data.id + 'not found' );
      return;
    }

    if( !t.time ){
      initTimeData( t, new Date() );
    }

    assertIsTimedTask( t )

    //const toBeStartDate = ganttDateToDate( data.start_date );
    //const toBeEndDate = ganttDateToDate( data.end_date );

    //t.time.startDate = toIsoString( toBeStartDate );
    // t.time.endDate = toIsoString( toBeEndDate );

    if( t.time.predecessors.length > 0 ){
      const workingHoursDuration = calculateWorkingHoursDuration( ganttDateToDate( data.start_date ), ganttDateToDate( data.end_date ) )
      const d = this.boardService.getComputedDatesAccountingForWorkingDays( t, workingHoursDuration );
      data.start_date =  d.startDate;
      data.end_date =  d.endDate;
      t.time.startDate = undefined
      t.time.endDate = undefined
      t.time.durationInWorkingHours = workingHoursDuration
      t.time.type = 'rolling';
      gantt.updateTask( t.id, data );
    }else{
      // no predecessors, task becomes fixed
      const startDate = ganttDateToDate( data.start_date );
      const endDate = ganttDateToDate( data.end_date );
      startDate.setHours( ganttConfig.startOfWorkingDay );
      endDate.setHours( ganttConfig.endOfWorkingDay )
      t.time.startDate = toIsoString(  startDate )
      t.time.endDate = toIsoString( endDate )
      data.start_date =  startDate;
      data.end_date =  endDate;
      t.time.durationInWorkingHours = undefined
      t.time.type = 'fixed'
      gantt.updateTask( t.id, data );
    }
    const successors = this.boardService.findSuccessors( t );
    if( successors.length > 0 ){
      successors.forEach( s => gantt.updateTask( s.id ) )
    }

    t.time.progress = data.progress ?? 0;
    t.textContent = data.text;

    this.changePublisherService.processChangesAndPublishUpdate( [t] );
    setTimeout( ()=> { this.lastUpdatedTasks = [] }, 100 )
    //this.init(this.lane.children);
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

    assertIsTimedTask( target );

    target.time.predecessors.push( {
      taskId: source.id,
      linkId: data.id.toString(),
    } )
    this.changePublisherService.processChangesAndPublishUpdate( [source, target] );

    /*
    source.time!.successors = source.time!.successors ?? [];
    if( source.time!.successors.find( l => l.taskId === target.id ) ){
      return;
    }
    source.time!.successors.push( {
      taskId: target.id,
      linkId: data.id.toString(),
    } );*/
    //this.changePublisherService.processChangesAndPublishUpdate( [source, target] );

  }
  deleteLink( id: string ){
    this.boardService.allTasks?.forEach( task => {
      if( task.time?.predecessors ){
        task.time.predecessors = task.time.predecessors.filter( p => p.linkId !== id );
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
      const initializedTask = initTimeData( task, lastDateInConverted );
      const firstResourceTag = task.tags?.find( t => t.type === tagTypes.tagOrange )?.tag;
      const dhtmlxTask = this.toDhtmlxTask( initializedTask, firstResourceTag ? getTaskBackgroundColor( firstResourceTag ) : undefined, order++, parentId, tasksCssClass, false, undefined );
      convertedTasks.push( dhtmlxTask );
      
      /*
      if( isRecurringTask( initializedTask ) && task.recurrences ){
        // Task has recurrence. Retrieve its recurrences.
        //this.toDhtmlxGanttDataModel(task.recurrences, convertedTasks, convertedLinks, initializedTask.id, tasksCssClass );
        
        const recs = task.recurrences?.map( ( r, i ) => this.toDhtmlxTask( r, firstResourceTag ? getTaskBackgroundColor( firstResourceTag ) : undefined, order++, task.id, tasksCssClass, true, i ) ) ?? [];
        convertedTasks = convertedTasks.concat( recs ); 
      }
      */
      if( task.children.length > 0 ){
        this.toDhtmlxGanttDataModel( task.children, convertedTasks, convertedLinks, task.id, tasksCssClass );
      }

      // Build task links
      if( task.time?.predecessors ){
        for( const predecessor of task.time.predecessors ){
          const link: DhtmlxLink = {
            id: predecessor.linkId,
            source: predecessor.taskId,
            target: task.id,
            editable: true,
            type: '0',
          };
          convertedLinks.push( link );
          // It may happen that a successor is not between the tasks or their descendants. We need to retrieve it and process it.
          if( tasks.map( t => t.id ).indexOf( predecessor.taskId ) < 0 ){
            const retrievedSucc = this.boardService.getTask( predecessor.taskId );
            if( !retrievedSucc ){
              console.error( 'Task ' + predecessor.taskId + ' not found' );
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
    gantt.config.autosize = 'y'
    gantt.config.multiselect = true;
    gantt.config.multiselect_one_level = false;
    gantt.config.preserve_scroll = true;
    gantt.config.initial_scroll = false;
    gantt.config.autoscroll = false;
    //gantt.config.min_duration = 1 * 1000 * 3600;
    //gantt.config.duration_unit = "day"
    //gantt.config.round_dnd_dates = false;
    //gantt.config.time_step = 60

    // default columns definition

    gantt.config.columns = []
    /*
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
    */
    gantt.config.grid_width = ganttConfig.columnsWidth;

    gantt.templates.grid_file = function(){
      return"";
    };
    gantt.config.sort = true;

    const start = new Date( Date.UTC( this.today.getUTCFullYear(), this.today.getUTCMonth(), 0 ) );
    const end = new Date( Date.UTC( this.today.getUTCFullYear(), this.today.getUTCMonth() + ganttConfig.shownMonths, 0 ) );

    //gantt.config.work_time = true;
    gantt.setWorkTime( { hours: [`${ganttConfig.startOfWorkingDay}:00-${ganttConfig.endOfWorkingDay}:00`] } );//global working hours. 8:00-12:00, 13:00-17:00
    gantt.templates.timeline_cell_class = function( task, date ){
      if( date.getDay() === 0 || date.getDay() === 6 ){
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
    gantt.templates.task_text = function( start, end, task ){
      return task.text + " (" + task.duration + " days)";
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
    // gantt.showDate( this.shownDate ?? this.today );
    
    gantt.addMarker( { 
      start_date: new Date(), 
      css: "today", 
      title:"Today"
    } );

    if( !this.dp ){
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
  }

  /**
   * Converts a local task to a DHX task
   */
  private toDhtmlxTask( task:TimedTask, color: string | undefined, order: number, parentId: string | undefined, cssClass: string | undefined, isRecurrenceStep: boolean, recurrenceIndex: number | undefined ): DhtmlxTask{
    const isProject = task.children.length > 0; 
    //const isRecurrentTask = isRecurringTask( task ); 
    
    let dates: {startDate: Date, endDate: Date} | undefined;
    if( isProject ){
      dates = undefined;
    }else if( isFixedTimedTask( task ) || isRollingTimedTask( task ) ){
      dates = this.boardService.getComputedDatesAccountingForWorkingDays( task );     
    }else{
      // no dates
      dates = {
        startDate:  new Date(),
        endDate:  new Date(),
      }
    }

    const dhtmlxTask: DhtmlxTask = {
      id: task.id,
      text: task.textContent,
      type: isProject  ? 'project' : 'task',
      start_date: !dates ? undefined :  dates.startDate,
      end_date:  !dates  ? undefined :  dates.endDate,
      parent: parentId,
      progress: task.time?.progress ?? 0,
      css: cssClass,
      row_height: ganttConfig.recurrentTaskHeight,
      bar_height:  ganttConfig.recurrentTaskHeight,
      color,
      order: order,
      mention: getFirstMentionTag( task ),
      //hasRecurrence: task.time.recurrence,
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
    const t = task['trepTask'] as TimedTask;
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
        gantt.config.duration_unit = "month"
        break
      case"days":
        gantt.config.scales = [{
          unit: 'month',
          format: '%F'
        }, {
          unit: 'day',
          date: '%j'
        }]
        //gantt.config.duration_unit = "hour"
        //gantt.config.skip_off_time = false;
        // gantt.config.round_dnd_dates = false;
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
        gantt.config.duration_unit = "hour"
        break;    
    }
    gantt.render()
  }

}
