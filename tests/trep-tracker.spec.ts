import{ test, expect, Locator, Page }from'@playwright/test';
import{ statusValues }from'../src/types/constants';
import Chart from'chart.js/auto';

const text = 'Hello World!';
const mention = 'mention';
let lanes;

let firstLane: Locator | undefined ;
let firstTask: Locator | undefined;
let menu
let board
let boardMenu: Locator | undefined;

const nOfTasks = 2;
const writeDelay = 5;

test.describe.configure( { mode: 'parallel' } );

test.beforeEach( async( { page } ) => {
  // setup the board, create some tasks
  await page.goto( 'http://localhost:4200' ); 

  board = page.locator( 'board' );
  lanes = page.locator( 'lane' );

  firstLane = lanes.first();
  firstTask = page.locator( 'task', {hasText: new RegExp( `${text} 0` ) } ).first();
  menu = page.locator( 'board-selection-menu' );

  boardMenu = page.locator( '.board-menu-tab' )
  const modal = page.locator( 'modal' );
  // Assert that the modal is visible
  await expect( modal ).toBeVisible();
  await page.click( 'text=Create a new status file' );
  
  // there is a lane
  await page.waitForSelector( 'lane' );
  expect( await lanes.count() ).toBe( 1 );

  // Drag lane to center
  await drag( page, firstLane!.locator( '.lane.drag-handle' ), 300, 400, false )

  for( let k=0; k<nOfTasks; k++ ){
    await addTask( page, k )
  }
  expect( await page.locator( 'task' ).count() ).toBe( nOfTasks )
} );

test.describe.parallel( 'Trep Tracker Tasks & lanes - ', () => {
  test( 'Task move, indent, outdent', async( { page } ) => {

    // switch position
    await page.keyboard.press( 'Control+Shift+ArrowDown' );
    await expect( page.locator( 'task' ).nth( 1 ) ).toHaveText( new RegExp( text ) );
    await page.keyboard.press( 'Control+Shift+ArrowUp' );
    await expect( page.locator( 'task' ).nth( 0 ) ).toHaveText( new RegExp( text ) );
    await page.keyboard.press( 'Control+Shift+ArrowDown' );

    // Child + remove
    await page.keyboard.press( 'Control+ArrowRight', {delay:200} );
    await expect( page.locator( '.child' ) ).toHaveText( new RegExp( text ) );
    await page.keyboard.press( 'Control+ArrowLeft' );
    expect( await page.locator( '.child' ).count() ).toBe( 0 )

    await page.keyboard.press( 'Control+Shift+ArrowUp' );
  } );

  test( 'Task drag & Lane resize', async( { page } ) => {
    const handle = getTaskByContent( page, 0 ).locator( '[draggable="true"]' ).first();
    await drag( page, handle, 100, 100, true );
    expect( await lanes.count() ).toBe( 2 )
    expect( await firstLane!.locator( 'task' ).count() ).toBe( nOfTasks - 1 )

    const handle2 = getTaskByContent( page, 1 ).locator( '[draggable="true"]' ).first();
    await drag( page, handle2, -200, -100, true );
    expect( await lanes.count() ).toBe( 3 )

    // drag second over first one
    const handle3 = getTaskByContent( page, 0 ).locator( '[draggable="true"]' ).first();
    await drag( page, handle3, -200, -100, true, getTaskByContent( page, 1 ) );
    expect( await lanes.count() ).toBe( 3 )
    expect( await page.locator( '.child' ).count() ).toBe( 1 )
    // remove child
    await getTaskByContent( page, 0 ).click()
    await page.keyboard.press( 'Control+ArrowLeft' );
    expect( await page.locator( '.child' ).count() ).toBe( 0 )

    // resize
    const l = page.locator( 'lane' ).nth( 2 );
    const bb = await l.boundingBox()
    if( !bb )return;

    const curWidth = bb?.width ;
    page.mouse.move( bb?.x + bb?.width - 3, bb?.y + bb?.height - 3 )
    page.mouse.down();
    await page.mouse.move( bb?.x + bb?.width + 100, bb?.y + bb?.height - 3 );
    const bb2 = await l.boundingBox();
    if( !bb2 ){ return }
    expect( bb2.width ).toBeGreaterThan( curWidth )

  } )

  test( 'Task notes', async( { page } ) => {
    // Notes
    const notesToggle = firstTask!.locator( '.task-notes' ).first();
    await notesToggle.click();
    const notes = firstTask!.locator( 'notes' );
    await expect( notes ).toBeVisible();
    await notes.click();
    await page.keyboard.type( text, {delay:writeDelay} );
    const toCkech = await notes.locator( 'textarea' ).inputValue();
    expect( toCkech ).toContain( text );
    await notesToggle.click();
    await expect( notes ).toBeHidden();
    await notesToggle.click();
    await expect( notes ).toBeVisible();
    const toCkech2 = await notes.locator( 'textarea' ).inputValue();
    expect( toCkech2 ).toContain( text );
  } );
  test( 'Task priority', async() => {
    // priority
    expect( await firstTask!.locator( '.priority-1' ).count() ).toBe( 1 )
    const prioritizer = firstTask!.locator( 'prioritizer' ).first();
    await prioritizer.click(); // expand
    expect( await prioritizer.locator( '.priority' ).count() ).toBe( 5 )
    await prioritizer.locator( '.cancel' ).click();
    expect( await firstTask!.locator( '.priority-1' ).count() ).toBe( 1 )
    await prioritizer.click(); // expand
    expect( await prioritizer.locator( '.priority' ).count() ).toBe( 5 )
    await prioritizer.locator( '.priority-4' ).click();
    expect( await firstTask!.locator( '.priority-4' ).count() ).toBe( 1 )
    expect( await prioritizer.locator( '.priority' ).count() ).toBe( 0 )

    expect( await menu.locator( '.priority-4 div', {hasText:"1"} ).count() ).toBe( 1 )

  } );
  test( 'Task status', async( { page } ) => {
    await setTaskStatus( firstTask!, page, 'status-completed' );
  } );

  test( 'Task archive', async( { page } ) => {
    // archive
    /*
    await firstTaskStatus!.click(); // expand
    await firstTaskStatus!.locator( '.status-archived' ).click();
    */
    await firstTask?.hover();
    await firstTask?.locator( '.task-archive' ).click();

    const archive = page.locator( 'lane', {hasText: /Archive/} ).first();
    await expect( archive ).toBeVisible();
    expect( await archive.locator( 'task' ).count() ).toBe( 0 )

    await expect( archive.locator( '.task-count' ).first() ).toHaveText( "1 tasks" )

    await page.locator( 'lane', {hasText: /Archive/} ).locator( '.expand' ).click();

    expect( await archive.locator( 'task' ).count() ).toBe( 1 )

    // unarchive
    const archived = archive.locator( 'task' )
    /*
    await archived.locator( 'status' ).first().click();
    await archived.locator( '.status-waiting' ).first().click();
    expect( await archive.locator( 'task' ).count() ).toBe( 0 )
    expect( await firstLane!.locator( 'task' ).count() ).toBe( nOfTasks )
    */
    // unarchive by drag
    await archived.locator( ".drag-handle" ).hover();
    await page.mouse.down();
    await firstLane!.hover()
    await page.mouse.up();
    await page.locator( "task" ).nth( 1 ).click(); 

    await page.keyboard.press( 'Control+ArrowLeft', {delay:200} );

    // Board task counts
    expect( await archive.locator( 'task' ).count() ).toBe( 0 )

    const menu = page.locator( 'board-selection-menu' );
    expect( await menu.locator( '.priority-1 div', {hasText:`${nOfTasks}`} ).count() ).toBe( 1 )
  } );
  test( 'Task tagz', async( { page } ) => {
    // add couple tasks
    for( let k=nOfTasks; k<nOfTasks + 2; k++ ){
      await addTask( page, k )
    }

    // add first mention w @ char
    const firstTask = getTaskByContent( page, 0 )
    await firstTask.click()
    for( let k= 0; k<text.length; k++ ){
      await page.keyboard.press( 'ArrowRight' );
    }
    await firstTask.pressSequentially( ` @${mention}` )
    expect( await page.locator( '.tag-orange' ).count() ).toBe( 1 )

    // add second w/o @char
    const secondTask = getTaskByContent( page, 1 )
    await secondTask.click()
    for( let k= 0; k<text.length; k++ ){
      await page.keyboard.press( 'ArrowRight' );
    }
    await secondTask.pressSequentially( ` ${mention}` )

    expect( await page.locator( '.tag-orange' ).count() ).toBe( 2 )

    await boardMenu!.click();
    // create static lane, should show 2 tasks
    await page.locator( '.add-lane' ).click();
    //await page.waitForSelector('lane:nth-child(1)');
    const staticLaneLoc = page.locator( 'lane' ).nth( 1 );
    await staticLaneLoc.locator( '.colored-title' ).click();
    await page.keyboard.press( `Control+A` )
    await page.keyboard.type( ` ${mention}`, {delay: writeDelay} )

    await staticLaneLoc.locator( 'task' ).nth( 1 ).waitFor( {state:'visible'} );

    expect( await staticLaneLoc.locator( 'task' ).count() ).toBe( 2 )

    // add another tag to task
    const thirdTask = getTaskByContent( page, 2 )
    await thirdTask.click()
    for( let k= 0; k<text.length; k++ ){
      await page.keyboard.press( 'ArrowRight' );
    }
    await thirdTask.pressSequentially( ` ${mention}` )
    await staticLaneLoc.locator( 'task' ).nth( 2 ).waitFor( {state:'visible'} );

    // static lane should be updated to 3 tasks
    expect( await staticLaneLoc.locator( 'task' ).count() ).toBe( 3 )

    // set static lane priority to 2
    await staticLaneLoc.locator( '.selectable.priority' ).click();
    await staticLaneLoc.locator( '.priority.priority-2' ).click();
    await page.waitForTimeout( 350 );
    expect( await staticLaneLoc.locator( 'task' ).count() ).toBe( 0 )
    await firstTask.locator( 'prioritizer' ).click();
    await firstTask.locator( '.priority.priority-2' ).click();
    await staticLaneLoc.locator( 'task' ).first().waitFor( {state:'visible'} );

    expect( await staticLaneLoc.locator( 'task' ).count() ).toBe( 1 )
    await page.waitForTimeout( 350 );

    // tag restructuring: change @mention to !mention
    expect( await page.locator( '.task-text-content', {hasText: new RegExp( '@' + mention )} ).count() ).toBe( 4 )
    const fTask = page.locator( 'task' ).first()
    await fTask.hover()
    await fTask.click()
    await page.keyboard.press( `Control+A` )

    await fTask.pressSequentially( `Tag refactoring !${mention}` )
    await page.waitForTimeout( 1000 );

    expect( await page.locator( '.task-text-content', {hasText: new RegExp( '!' + mention )} ).count() ).toBe( 4 )
    await fTask.click()
    await page.keyboard.press( `Control+A` )

    await fTask.pressSequentially( `Tag refactoring #${mention}` )
    await page.waitForTimeout( 1000 );
    expect( await page.locator( '.task-text-content', {hasText: new RegExp( '#' + mention )} ).count() ).toBe( 4 )

  } )

  test( 'Board layouts', async( { page } ) => {
    // Switch layouts
    await boardMenu!.click();

    const toolbar = page.locator( 'board-toolbar' );
    const layouts = toolbar.locator( '.layout' );
    expect( await layouts.count() ).toBe( 5 )
    for( let i = 0; i<5; i++ ){
      await layouts.nth( i ).click(); //flex1
      const count = await lanes.count();

      for( let r = 0; r < count; r++ ){
        if( i == 0 ){
          await expect( lanes.nth( r ) ).toHaveCSS( 'position', 'absolute' )
        }else{
          await boardMenu!.click();
          await expect( lanes.nth( r ) ).not.toHaveCSS( 'position', 'absolute' );
          expect( await board.locator( '.board-column' ).count() ).toBe( i )
        }
      }
      expect( await lanes.count() ).toBe( 1 )

    }

    // search
    const search = page.locator( 'search' );
    await search.click();
    // await search.locator('input').fill(text);
    await page.keyboard.type( text, {delay:writeDelay} );

    await boardMenu!.click();
    const toCkech3 = await search.locator( 'input' ).inputValue();
    expect( toCkech3 ).toContain( text );
    // expect(await search.locator('span',{hasText:"1 matches"}).count()).toBe(1) TODO fix

  } );

  test( 'Task - gantt', async( { page } ) => { 
    await setDatesForVisibleTasks( page );
    //await boardMenu!.click();
    //await page.locator( '.show-in-gantter' ).first().click()
  
    //expect( await page.locator( '.show-in-gantter.selected' ).count() ).toBe( 1 );
    await page.locator( 'gantt-button' ).first().click();
    expect( await page.locator( 'gantt' ).count() ).toBe( 1 );
    expect( await page.locator( '.gantt_row_task' ).count() ).toBe( 2 ); 

    await page.locator( '.close.pointer.absolute' ).first().click();
    //await page.locator( '.show-in-gantter' ).nth( 1 ).click()
    //expect( await page.locator( '.show-in-gantter.selected' ).count() ).toBe( 2 );
    await page.locator( 'gantt-button' ).first().click();
    expect( await page.locator( '.gantt_row_task' ).count() ).toBe( 2 );

    await expect( page.locator( '.gantt_row_task' ).first() ).toHaveText( new RegExp( `${text} ${0}` ) )

    // switch tasks
    await page.locator( '.gantt_row_task' ).first().hover();
    await page.mouse.down();
    await page.locator( '.gantt_row_task' ).nth( 1 ).hover();
    await page.mouse.up();
    await expect( page.locator( '.gantt_row_task' ).first() ).toHaveText( new RegExp( `${text} ${1}` ) )

    // move
    const ganttBar = page.locator( '.gantt_bar_task' ).first();
    const bb = await ganttBar.boundingBox();
    if( !bb ){
      return;
    }
    await ganttBar.hover();
    await page.mouse.down();
    await page.mouse.move( bb.x + 100, bb.y );
    await page.mouse.up();
    const bb2 = await ganttBar.boundingBox();
    expect( bb2?.x ).toBeGreaterThan( bb.x + 50 )

    // increase duration
    await expect( page.locator( '.gantt_last_cell' ).nth( 1 ) ).toHaveText( /[012]/ )
    const dragEl = ganttBar.locator( '.task_end_date' ).first();
    const bb3 = await ganttBar.boundingBox();
    if( !bb3 ){
      return;
    }
    await ganttBar.hover();
    await dragEl.hover( {force:true} );
    await page.mouse.down();
    await page.mouse.move( bb3.x + 300, bb3.y + bb3.height / 2 );
    await page.mouse.up();
    await page.waitForTimeout( 400 );

    await  expect( ( await page.locator( '.gantt_task_line' ).first().boundingBox() )?.x ).toBeGreaterThan( 200 );

  } )

  test( 'Board - add new, activate, change name', async( { page } ) => { 
    expect( await page.locator( '.available-board' ).count() ).toBe( 1 )
    await page.locator( '.add-board' ).click();
    expect( await page.locator( '.available-board' ).count() ).toBe( 2 )
    await page.locator( '.available-board' ).nth( 1 ).click();
    expect( await page.locator( 'task' ).count() ).toBe( 0 )
    // change name
    await page.locator( '.board-label' ).click();
    await page.keyboard.press( 'Control+A' );
    await page.keyboard.press( 'Backspace' );
    await page.keyboard.type( "My new board", {delay:writeDelay} );
    expect( await page.locator( '.board-selection.active', {hasText: /My new board/} ).count() ).toBe( 1 )
    await page.click( '.new-task' );
    expect( await page.locator( 'task' ).count() ).toBe( 1 )
    await page.locator( '.available-board' ).nth( 0 ).click();
    expect( await page.locator( 'task' ).count() ).toBe( nOfTasks )
  } )

  test( 'Board - search', async( { page } ) => {
    // await boardMenu!.click();
    await page.locator( '.search-input' ).hover();
    await page.locator( '.search-input' ).click();
    //await page.locator('.search-input').pressSequentially(text);
    await page.keyboard.type( text, {delay:writeDelay} );
    await page.waitForSelector( '.search-matches' );
    await page.waitForTimeout( 200 ); 

    await expect( page.locator( '.search-matches' ) ).toHaveText( "2 matches" )
  } )

  test( 'Task - picker and dates, recurrences', async( { page } ) => {
    await setDatesForVisibleTasks( page )
    await boardMenu!.click();
    await page.locator( '.add-lane' ).last().click();
    await expect( page.locator( 'lane' ) ).toHaveCount( 2 );
    await page.locator( 'lane' ).last().locator( '.select-dates' ).click();
    await expect( page.locator( 'owl-date-time-container' ) ).toHaveCount( 1 );
    await page.locator( '.recurrence-option ' ).nth( 3 ).click();
    await page.locator( '.owl-dt-control-button-content' ).last().click();
    await expect( page.locator( 'lane' ).last().locator( 'task' ) ).toHaveCount( 2 );

    await addTask( page, 1 );
    let lastTask = page.locator( 'lane' ).first().locator( 'task' ).last();
    await setPickerToCurrentYearNextMonth( lastTask, page, 1 );
    lastTask = page.locator( 'lane' ).first().locator( '.recurrent-task-container' ).last();

    // recurrences: make a task recurrent, complete a recurrence, another one should appear.
    await expect( lastTask.locator( '.recurrences-toggle' ) ).toBeVisible();
    await expect( lastTask.locator( '.task-recurrence-wrapper task' ) ).toHaveCount( 2 );
    const firstRec = lastTask.locator( 'task.child' ).first();
    await firstTask!.hover();
    await setTaskStatus( firstRec, page, 'status-completed' );
    await expect( lastTask.locator( '.task-recurrence-wrapper task' ) ).toHaveCount( 3 );
  } )

  test( 'Task - projects', async( { page } ) => {
    await addTask( page, 1 );

    await page.locator( 'task' ).nth( 1 ).click();
    await page.keyboard.press( 'Control+ArrowRight', {delay:200} );
    await page.locator( 'task' ).nth( 2 ).click();
    await page.keyboard.press( 'Control+ArrowRight', {delay:200} );
    await page.keyboard.press( 'Control+ArrowLeft', {delay:200} );

    // Initially the project is in progress
    await expect( page.locator( '.project' ) ).toHaveCount( 1 );
    await expect( page.locator( 'task' ).first().locator( '.status' ).nth( 0 ) ).toHaveClass( /status-todo/ );

    // change status for a child should put the project 'in progress
    await setTaskStatus( page.locator( 'task' ).nth( 1 ), page, 'status-delegated' );
    await expect( page.locator( 'task' ).first().locator( '.status' ).nth( 0 ) ).toHaveClass( /status-in-progress/ );

    // change status for all the children(2) should put the project in the same status:
    await setTaskStatus( page.locator( 'task' ).nth( 2 ), page, 'status-delegated' );
    await expect( page.locator( 'task' ).first().locator( '.status' ).nth( 0 ) ).toHaveClass( /status-delegated/ );

    // change the status of the first child should return the project 'in progress'
    await setTaskStatus( page.locator( 'task' ).nth( 1 ), page, 'status-to-be-delegated' );
    await expect( page.locator( 'task' ).first().locator( '.status' ).nth( 0 ) ).toHaveClass( /status-in-progress/ );
  } );

  test( 'Task - similarity', async( { page } ) => {
    await page.waitForTimeout( 1100 ); // time for similarity to be evaluated
    const l = page.locator( 'lane' ).first();
    const bb = await l.boundingBox()
    if( !bb )return;

    await page.mouse.move( bb?.x + bb?.width - 3, bb?.y + bb?.height - 3 )
    await page.mouse.down();
    await page.mouse.move( bb?.x + bb?.width + 300, bb?.y + bb?.height - 3 );
    await page.mouse.up();

    await expect( page.locator( '.similar-pill' ) ).toHaveCount( 2 );
    await expect( page.locator( '.similar-pill' ).first().locator( 'span' ) ).toHaveText( "1 similar (92%)" )

    // hover and check arrows
    await page.locator( '.similar-pill' ).first().hover();

    await page.waitForSelector( '.leader-line' );
    await expect( page.locator( '.leader-line' ) ).toHaveCount( 1 );

    // add another task, recheck similarities
    await addTask( page, 2 );
    await page.waitForTimeout( 1300 ); // time for similarity to be evaluated

    await expect( page.locator( '.similar-pill' ) ).toHaveCount( 3 );
    await expect( page.locator( '.similar-pill' ).first().locator( 'span' ) ).toHaveText( "2 similar (92%)" )
    // hover and check arrows
    await page.locator( '.similar-pill' ).first().hover();

    await page.waitForSelector( '.leader-line' );
    await expect( page.locator( '.leader-line' ) ).toHaveCount( 2 );

  } );

  test( 'Board charts', async( { page } ) => {
    await page.locator( 'charts' ).click();
    await page.waitForTimeout( 1300 ); // animation
    await expect( page.locator( 'chart' ) ).toHaveCount( 4 );
    // Verify chart data
    let instances = await page.evaluate( async() => {
      // @ts-expect-error extract chart instances
      const instances = ( window.chart as Chart ).instances;
      return instances;
    } );
    await expect( instances[Object.keys( instances )[0]]._sortedMetasets[0]._dataset.data[0] ).toBe( 2 ); // todos
    await expect( instances[Object.keys( instances )[1]]._sortedMetasets[0]._dataset.data[0] ).toBe( 2 ); // prio 1
    await expect( instances[Object.keys( instances )[2]]._sortedMetasets[0]._dataset.data[0] ).toBe( undefined ); // tags

    await expect( instances[Object.keys( instances )[3]]._sortedMetasets[2]._dataset.data[instances[Object.keys( instances )[3]]._sortedMetasets[2]._dataset.data.length - 1] ).toBe( 2 ); // created bar

    await setTaskStatus( firstTask!, page, 'status-completed' );
    await page.waitForTimeout( 1300 ); // animation

    instances = await page.evaluate( async() => {
      // @ts-expect-error extract chart instances
      const instances = ( window.chart as Chart ).instances;
      return instances;
    } );

    await expect( instances[Object.keys( instances )[0]]._sortedMetasets[0]._dataset.data[0] ).toBe( 1 ); // todos
    await expect( instances[Object.keys( instances )[1]]._sortedMetasets[0]._dataset.data[0] ).toBe( 2 ); // prio 1
    await expect( instances[Object.keys( instances )[2]]._sortedMetasets[0]._dataset.data[0] ).toBe( undefined ); // tags
    await expect( instances[Object.keys( instances )[3]]._sortedMetasets[2]._dataset.data[instances[Object.keys( instances )[3]]._sortedMetasets[2]._dataset.data.length - 1] ).toBe( 2 ); // created bar
    await expect( instances[Object.keys( instances )[3]]._sortedMetasets[3]._dataset.data[instances[Object.keys( instances )[3]]._sortedMetasets[3]._dataset.data.length - 1] ).toBe( 1 ); // completed bar
  } )

} );

async function setDatesForVisibleTasks( page: Page ){
  const loc =  page.locator( 'task' );
  for( let i = 0; i < await loc.count(); i++ ){
    const task = loc.nth( i );
    await setPickerToCurrentYearNextMonth( task, page )
  }
}

async function setPickerToCurrentYearNextMonth( task:Locator, page: Page, recurrence?: number ){
  const nextMonth = new Date( new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3 );
  await task!.hover();
  await expect( task!.locator( '.select-dates' ) ).toBeVisible();

  await task!.locator( '.select-dates' ).click();

  await page.locator( '.owl-dt-control-content.owl-dt-control-button-content' ).nth( 1 ).click();
  await page.locator( '.owl-dt-calendar-cell-content', {hasText: nextMonth.toLocaleString( 'default', { year: 'numeric' } )} ).click();
  await page.locator( '.owl-dt-calendar-cell-content', {hasText: nextMonth.toLocaleString( 'default', { month: 'short' } )} ).click();
  await page.locator( '.owl-dt-calendar-cell-content', {hasText: new RegExp( `^ ${nextMonth.getDate()} $` )} ).first().click();
  await expect( page.locator( '.owl-dt-control-content.owl-dt-container-range-content' ).nth( 0 ) ).toContainText( `${nextMonth.getMonth() + 1}/${nextMonth.getDate()}/${nextMonth.getFullYear()}` )
  await expect( page.locator( '.owl-dt-control-content.owl-dt-container-range-content' ).nth( 1 ).locator( '.owl-dt-container-info-value' ) ).toBeEmpty()
  await page.locator( '.owl-dt-calendar-cell-content', {hasText: new RegExp( `^ ${nextMonth.getDate()+1} $` )} ).first().click();
  await expect( page.locator( '.owl-dt-control-content.owl-dt-container-range-content' ).nth( 1 ) ).toContainText( `${nextMonth.getMonth() + 1}/${nextMonth.getDate()+1}/${nextMonth.getFullYear()}` )
  if( recurrence ){
    await page.locator( 'owl-date-time-container' ).locator( '.recurrence-option' ).nth( recurrence ).click()
  }
  await page.locator( '.owl-dt-control-button-content' ).last().click();
  if( !recurrence ){
    await expect( task.locator( '.dates-n-stuff' ) ).toContainText( `planned` )
    await expect( task.locator( '.dates-n-stuff' ) ).toContainText( `${nextMonth.getMonth() + 1}/${nextMonth.getDate()}/${nextMonth.getFullYear()}` )
    await expect( task.locator( '.dates-n-stuff' ) ).toContainText( `${nextMonth.getMonth() + 1}/${nextMonth.getDate()+1}/${nextMonth.getFullYear()}` )
  }
}

async function setTaskStatus( task:Locator, page: Page, statusCode: string ){
  const status =  task.locator( 'status' ).first()
  // status
  //expect( await task!.locator( '.status-todo' ).count() ).toBe( 1 )
  await page.locator( '.board-menu' ).hover()
  await status!.hover()
  await status!.click(); // expand
  expect( await status!.locator( '.status' ).count() ).toBe( Object.keys( statusValues ).length )
  await status!.locator( '.cancel' ).click();
  
  //expect( await task!.locator( '.status-todo' ).count() ).toBe( 1 )
  await page.locator( '.board-menu' ).hover()
  await status!.hover()
  await status!.click(); // expand
  expect( await status!.locator( '.status' ).count() ).toBe( Object.keys( statusValues ).length )
  await status!.locator( '.' + statusCode ).click();
  expect( await status!.locator( '.' + statusCode ).count() ).toBe( 1 )
  expect( await status!.locator( '.status' ).count() ).toBe( 1 )
  
}

function getTaskByContent( page: Page, content: number ): Locator{
  return page.locator( 'task:not(.child)', {hasText: new RegExp( `${text} ${content}` )} )
}

async function addTask( page: Page, k: number ){
  await page.click( '.new-task' );
  // write on a task
  const curTask = page.locator( 'task' ).nth( k );
  await curTask.click()
  await page.keyboard.press( 'Control+A' );
  await page.keyboard.press( 'Backspace' );
  await page.keyboard.type( `${text} ${k}`, {delay:writeDelay} );
  await expect( curTask ).toHaveText( new RegExp( `${text} ${k}` ) );
}

async function drag( page: Page, locator: Locator, deltax: number, deltay: number, task: boolean, targetLocator?: Locator ){
  const dragHandle = locator;
  const box = await dragHandle.boundingBox();
  if( box ){
    // Click and hold at the center of the element
    await dragHandle.hover();
    // await dragHandle.click();
    await page.mouse.down();
  
    if( targetLocator ){
      await targetLocator.hover();
      await page.mouse.up();

    }else{
      const oldX = box.x
      const oldY = box.y

      await page.mouse.move( box.x + deltax, box.y + deltay );
      // Release the mouse button
      await page.mouse.up();
  
      // Optional: Verify the new position
      const newBox = await dragHandle.boundingBox();
      if( deltax > 0 && deltay > 0 ){
        expect( ( newBox?.x ?? 0 ) ).toBeGreaterThan( oldX + deltax/2 ); // Allow some small deviation
        expect( ( newBox?.y ?? 0 ) ).toBeGreaterThan( oldY + deltay/2 ); // Allow some small deviation
      }

    }

  }else{
    throw new Error( 'Element not found or not visible' );
  }
}