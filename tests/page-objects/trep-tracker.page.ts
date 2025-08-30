import{ Page, Locator, expect }from'@playwright/test';
import{ statusValues }from'../../src/types/constants';
import*as os from'os';

export class TrepTrackerPage{
  readonly page: Page;
  readonly metaKey: string;
  
  // Main elements
  readonly board: Locator;
  readonly lanes: Locator;
  readonly firstLane: Locator;
  readonly menu: Locator;
  readonly boardMenu: Locator;
  readonly modal: Locator;
  readonly newTaskButton: Locator;
  readonly searchInput: Locator;
  readonly charts: Locator;

  // Test data
  readonly testText = 'Hello World!';
  readonly testMention = 'mention';
  readonly writeDelay = 5;
  readonly locale = 'it-IT';

  constructor( page: Page ){
    this.page = page;
    this.metaKey = os.platform() === 'darwin' ? 'Meta' : 'Control';
    
    // Initialize locators
    this.board = page.locator( 'board' );
    this.lanes = page.locator( 'lane' );
    this.firstLane = this.lanes.first();
    this.menu = page.locator( 'board-selection-menu' );
    this.boardMenu = page.locator( '.board-menu-tab' );
    this.modal = page.locator( 'modal' );
    this.newTaskButton = page.locator( '.new-task' );
    this.searchInput = page.locator( '.search-input' );
    this.charts = page.locator( 'charts' );
  }

  async goto(){
    await this.page.goto( 'http://localhost:4200' );
  }

  async setupNewBoard(){
    await expect( this.modal ).toBeVisible();
    await this.page.click( 'text=Create a new status file' );
    await this.page.waitForSelector( 'lane' );
    
    // Position the first lane
    await this.dragElement(
      this.firstLane.locator( '.lane.drag-handle' ), 
      300, 
      400, 
      false
    );
  }

  async createTasks( count: number ): Promise<void>{
    for( let i = 0; i < count; i++ ){
      await this.addTask( i );
    }
    await expect( this.page.locator( 'task' ) ).toHaveCount( count );
  }

  async addTask( index: number ): Promise<void>{
    await this.newTaskButton.click();
    const taskContent = this.page.locator( 'task' ).nth( index ).locator( '.task-text-content' );
    await taskContent.click();
    await this.page.keyboard.press( `${this.metaKey}+A` );
    await this.page.keyboard.press( 'Backspace' );
    await this.page.keyboard.type( `${this.testText} ${index}`, { delay: this.writeDelay } );
    await expect( taskContent ).toHaveText( new RegExp( `${this.testText} ${index}` ) );
  }

  getTaskByContent( index: number ): Locator{
    return this.page.locator( 'task:not(.child)', { 
      hasText: new RegExp( `${this.testText} ${index}` ) 
    } );
  }

  getFirstTask(): Locator{
    return this.page.locator( 'task', { 
      hasText: new RegExp( `${this.testText} 0` ) 
    } ).first();
  }

  async dragElement(
    element: Locator, 
    deltaX: number, 
    deltaY: number, 
    isTask: boolean, 
    target?: Locator
  ): Promise<void>{
    const box = await element.boundingBox();
    if( !box ){
      throw new Error( 'Element not found or not visible' );
    }

    await element.hover();
    await this.page.mouse.down();

    if( target ){
      await target.hover();
      if( isTask ){
        await this.page.waitForTimeout( 350 );
        await target.hover();
      }
      await this.page.mouse.up();
    }else{
      const oldX = box.x;
      const oldY = box.y;

      await this.page.mouse.move( box.x + deltaX, box.y + deltaY );
      await this.page.mouse.up();

      // Verify movement if both deltas are positive
      if( deltaX > 0 && deltaY > 0 ){
        const newBox = await element.boundingBox();
        expect( newBox?.x ?? 0 ).toBeGreaterThan( oldX + deltaX / 2 );
        expect( newBox?.y ?? 0 ).toBeGreaterThan( oldY + deltaY / 2 );
      }
    }
  }

  async setTaskStatus( task: Locator, statusCode: string ): Promise<void>{
    const status = task.locator( 'status' ).first();
    
    // Open status dropdown
    await this.page.locator( '.board-menu' ).hover();
    await status.hover();
    await status.click();
    
    expect( await status.locator( '.status' ).count() ).toBe( Object.keys( statusValues ).length );
    
    // Cancel and try again (seems to be required by the UI)
    await status.locator( '.cancel' ).click();
    await this.page.locator( '.board-menu' ).hover();
    await status.hover();
    await status.click();
    
    // Set the desired status
    await status.locator( `.${statusCode}` ).click();
    
    // Verify status was set
    expect( await status.locator( `.${statusCode}` ).count() ).toBe( 1 );
    expect( await status.locator( '.status' ).count() ).toBe( 1 );
  }

  async setTaskPriority( task: Locator, priority: number ): Promise<void>{
    task = task.first();
    const prioritizer = task.locator( 'prioritizer' ).first();
    await prioritizer.click();
    await prioritizer.locator( `.priority-${priority}` ).click();
    await expect( task.locator( `.priority-${priority}` ) ).toHaveCount( 1 );
  }

  async addTagToTask( task: Locator, tag: string, withAtSymbol: boolean = true ): Promise<void>{
    const taskContent = task.locator( '.task-text-content' );
    await taskContent.click();
    
    // Move to end of text
    for( let i = 0; i < this.testText.length; i++ ){
      await this.page.keyboard.press( 'ArrowRight' );
    }
    
    const tagText = withAtSymbol ? `@${tag}` : tag;
    await taskContent.pressSequentially( ` ${tagText}`, { timeout: 300 } );
  }

  async setDatePicker( task: Locator, daysFrom1stDay: number = 3, recurrence?: number ): Promise<void>{
    const nextDate = new Date();
    nextDate.setDate( 1 + daysFrom1stDay );
    
    await task.hover();
    await expect( task.locator( '.select-dates' ) ).toBeVisible();
    await task.locator( '.select-dates' ).click();

    // Navigate to the target date
    await this.page.locator( '.owl-dt-control-content.owl-dt-control-button-content' ).nth( 1 ).click();
    await this.page.locator( '.owl-dt-calendar-cell-content', {
      hasText: nextDate.toLocaleString( this.locale, { year: 'numeric' } )
    } ).click();
    await this.page.locator( '.owl-dt-calendar-cell-content', {
      hasText: nextDate.toLocaleString( this.locale, { month: 'short' } )
    } ).click();
    
    // Set start date
    await this.page.locator( '.owl-dt-calendar-cell-content', {
      hasText: new RegExp( `^ ${nextDate.getDate()} $` )
    } ).first().click();
    
    // Set end date (next day)
    const endDate = new Date( nextDate );
    endDate.setDate( 3 + daysFrom1stDay );
    await this.page.locator( '.owl-dt-calendar-cell-content', {
      hasText: new RegExp( `^ ${endDate.getDate()} $` )
    } ).first().click();

    if( recurrence ){
      await this.page.locator( 'owl-date-time-container' )
        .locator( '.recurrence-option' )
        .nth( recurrence )
        .click();
    }

    await this.page.locator( '.owl-dt-control-button-content' ).last().click();
  }

  async archiveTask( task: Locator ): Promise<void>{
    await task.hover();
    await task.locator( '.task-archive' ).click();
  }

  async getArchiveLane(): Promise<Locator>{
    return this.page.locator( 'lane', { hasText: /Archive/ } ).first();
  }

  async expandArchive(): Promise<void>{
    const archive = await this.getArchiveLane();
    await archive.locator( '.expand' ).click();
  }

  async openBoardMenu(): Promise<void>{
    await this.boardMenu.click();
  }

  async createStaticLane( filterText: string ): Promise<Locator>{
    await this.openBoardMenu();
    await this.page.locator( '.add-lane' ).click();
    const staticLane = this.lanes.nth( 1 );
    await staticLane.locator( '.colored-title' ).click();
    await this.page.keyboard.press( `${this.metaKey}+A` );
    await this.page.keyboard.type( ` ${filterText}`, { delay: this.writeDelay } );
    return staticLane;
  }

  async openGanttFromLane(): Promise<void>{
    await this.firstLane.locator( '.open-lane-menu' ).first().click();
    await expect( this.page.locator( 'lane-menu' ) ).toBeVisible();
    await this.page.locator( 'lane-menu' ).locator( '.gantt' ).first().click();
    await this.page.waitForTimeout( 2500 ); // Wait for gantt to load
  }

  async createBoard( name: string ): Promise<void>{
    await this.page.locator( '.add-board' ).click();
    await this.page.locator( '.available-board' ).last().click();
    await this.page.locator( '.board-label' ).click();
    await this.page.keyboard.press( `${this.metaKey}+A` );
    await this.page.keyboard.press( 'Backspace' );
    await this.page.keyboard.type( name, { delay: this.writeDelay } );
  }

  async switchToBoard( index: number ): Promise<void>{
    await this.page.locator( '.available-board' ).nth( index ).click();
  }

  async searchTasks( searchText: string ): Promise<void>{
    await this.searchInput.hover();
    await this.searchInput.click();
    await this.searchInput.click(); // Double click seems to be needed
    await this.page.keyboard.type( searchText, { delay: this.writeDelay } );
  }

  async expectTaskCount( count: number ): Promise<void>{
    await expect( this.page.locator( 'task' ) ).toHaveCount( count );
  }

  async expectLaneCount( count: number ): Promise<void>{
    await expect( this.lanes ).toHaveCount( count );
  }

  async expectSearchResults( count: number ): Promise<void>{
    await this.page.waitForSelector( '.search-matches' );
    await expect( this.page.locator( '.search-matches' ) ).toHaveText( `${count} matches` );
  }
}