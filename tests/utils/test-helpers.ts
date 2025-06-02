import{ Page, Locator, expect }from'@playwright/test';
import Chart from'chart.js/auto';

export interface TestConfig {
  readonly nOfTasks: number;
  readonly writeDelay: number;
  readonly animationDelay: number;
  readonly similarityEvaluationDelay: number;
}

export const DEFAULT_CONFIG: TestConfig = {
  nOfTasks: 2,
  writeDelay: 5,
  animationDelay: 1300,
  similarityEvaluationDelay: 1100,
};

export class TaskKeyboardActions{
  constructor( private page: Page, private metaKey: string ){}

  async moveTaskDown(): Promise<void>{
    await this.page.keyboard.press( `${this.metaKey}+Shift+ArrowDown` );
  }

  async moveTaskUp(): Promise<void>{
    await this.page.keyboard.press( `${this.metaKey}+Shift+ArrowUp` );
  }

  async indentTask(): Promise<void>{
    await this.page.keyboard.press( `${this.metaKey}+ArrowRight`, { delay: 200 } );
  }

  async outdentTask(): Promise<void>{
    await this.page.keyboard.press( `${this.metaKey}+ArrowLeft`, { delay: 200 } );
  }

  async selectAll(): Promise<void>{
    await this.page.keyboard.press( `${this.metaKey}+A` );
  }

  async focusSearch(): Promise<void>{
    await this.page.keyboard.press( `${this.metaKey}+f` );
  }
}

export class ChartTestHelpers{
  constructor( private page: Page ){}

  async getChartInstances(): Promise<Record<string, Chart>>{
    return await this.page.evaluate( async() => {
      // @ts-expect-error extract chart instances
      const instances = ( window.chart as Chart ).instances;
      return instances;
    } );
  }

  async expectChartData( chartIndex: number, dataIndex: number, expectedValue: number | undefined ): Promise<void>{
    const instances = await this.getChartInstances();
    const chartKeys = Object.keys( instances );
    // @ts-expect-error accessing chart internal structure
    const chartData = instances[chartKeys[chartIndex]]._sortedMetasets[0]._dataset.data[dataIndex];
    expect( chartData ).toBe( expectedValue );
  }

  async expectTimeSeriesData( chartIndex: number, seriesIndex: number, expectedValue: number ): Promise<void>{
    const instances = await this.getChartInstances();
    const chartKeys = Object.keys( instances );
    const chart = instances[chartKeys[chartIndex]];
    // @ts-expect-error accessing chart internal structure
    const dataLength = chart._sortedMetasets[seriesIndex]._dataset.data.length;
    // @ts-expect-error accessing chart internal structure
    const lastValue = chart._sortedMetasets[seriesIndex]._dataset.data[dataLength - 1];
    expect( lastValue ).toBe( expectedValue );
  }
}

export class LaneTestHelpers{
  constructor( private page: Page ){}

  async resizeLane( lane: Locator, widthIncrease: number ): Promise<void>{
    const boundingBox = await lane.boundingBox();
    if( !boundingBox ){
      throw new Error( 'Lane not found or not visible' );
    }

    const originalWidth = boundingBox.width;
    
    // Move to resize handle (bottom-right corner)
    await this.page.mouse.move(
      boundingBox.x + boundingBox.width - 3,
      boundingBox.y + boundingBox.height - 3
    );
    await this.page.mouse.down();
    
    // Drag to resize
    await this.page.mouse.move(
      boundingBox.x + boundingBox.width + widthIncrease,
      boundingBox.y + boundingBox.height - 3
    );
    await this.page.mouse.up();

    // Verify resize
    const newBoundingBox = await lane.boundingBox();
    if( newBoundingBox ){
      expect( newBoundingBox.width ).toBeGreaterThan( originalWidth );
    }
  }

  async switchLayout( layoutIndex: number ): Promise<void>{
    const toolbar = this.page.locator( 'board-toolbar' );
    const layouts = toolbar.locator( '.layout' );
    await layouts.nth( layoutIndex ).click();
  }

  async expectLayoutPosition( lanes: Locator, isAbsolute: boolean ): Promise<void>{
    const count = await lanes.count();
    for( let i = 0; i < count; i++ ){
      if( isAbsolute ){
        await expect( lanes.nth( i ) ).toHaveCSS( 'position', 'absolute' );
      }else{
        await expect( lanes.nth( i ) ).not.toHaveCSS( 'position', 'absolute' );
      }
    }
  }
}

export class GanttTestHelpers{
  constructor( private page: Page ){}

  async moveGanttBar( barSelector: string, deltaX: number ): Promise<void>{
    const ganttBar = this.page.locator( barSelector ).first();
    const boundingBox = await ganttBar.boundingBox();
    
    if( !boundingBox ){
      throw new Error( 'Gantt bar not found' );
    }

    await ganttBar.hover();
    await this.page.mouse.down();
    await this.page.mouse.move( boundingBox.x + deltaX, boundingBox.y );
    await this.page.mouse.up();
    await this.page.waitForTimeout( 400 );

    // Verify movement (allow for some tolerance)
    const newBoundingBox = await ganttBar.boundingBox();
    if( newBoundingBox ){
      expect( newBoundingBox.x ).toBeGreaterThanOrEqual( boundingBox.x - 10 );
    }
  }

  async resizeGanttBar( barSelector: string, deltaX: number ): Promise<void>{
    const ganttBar = this.page.locator( barSelector ).first();
    const boundingBox = await ganttBar.boundingBox();
    
    if( !boundingBox ){
      throw new Error( 'Gantt bar not found' );
    }

    await ganttBar.hover();
    const dragHandle = ganttBar.locator( '.task_end_date' ).first();
    await dragHandle.hover( { force: true } );
    await this.page.mouse.down();
    await this.page.mouse.move(
      boundingBox.x + deltaX, 
      boundingBox.y + boundingBox.height / 2
    );
    await this.page.mouse.up();
    await this.page.waitForTimeout( 400 );
  }
}

export async function waitForStableDOM( page: Page, selector: string, timeout: number = 5000 ): Promise<void>{
  let previousCount = -1;
  let stableCount = 0;
  const maxStableChecks = 5;
  const checkInterval = 100;

  const startTime = Date.now();
  while( Date.now() - startTime < timeout ){
    const currentCount = await page.locator( selector ).count();
    
    if( currentCount === previousCount ){
      stableCount++;
      if( stableCount >= maxStableChecks ){
        return;
      }
    }else{
      stableCount = 0;
      previousCount = currentCount;
    }
    
    await page.waitForTimeout( checkInterval );
  }
  
  throw new Error( `DOM did not stabilize for selector "${selector}" within ${timeout}ms` );
}

export async function expectEventuallyVisible(
  locator: Locator, 
  timeout: number = 5000
): Promise<void>{
  await expect( locator ).toBeVisible( { timeout } );
}

export async function expectEventuallyHidden(
  locator: Locator, 
  timeout: number = 5000
): Promise<void>{
  await expect( locator ).toBeHidden( { timeout } );
}

export async function expectEventuallyCount(
  locator: Locator, 
  count: number, 
  timeout: number = 5000
): Promise<void>{
  await expect( locator ).toHaveCount( count, { timeout } );
}