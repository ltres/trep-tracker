import { test, expect, Locator, Page } from '@playwright/test';

const  text = 'Hello World!';
let lanes;
let tasks;

let firstLane ;
let firstTask;
let firstTaskStatus;
let menu
let board
const nOfTasks = 2;
const writeDelay = 5;

test.beforeEach(async ({ page }) => {
  // setup the board, create some tasks
  await page.goto('http://localhost:4200'); 
  board = page.locator('board');
  lanes = page.locator('lane');
  tasks = page.locator('task');

  firstLane = lanes.first();
  firstTask = page.locator('task', {hasText: new RegExp(`${text} 0`) }).first();
  firstTaskStatus = firstTask.locator('status').first();
  menu = page.locator('board-selection-menu');

  const modal = page.locator('modal');
  // Assert that the modal is visible
  await expect(modal).toBeVisible();
  await page.click('text=Create a new status file');
  
  // there is a lane
  await page.waitForSelector('lane');
  expect(await lanes.count()).toBe(1);

  // Drag lane to center
  await drag(page , firstLane.locator('.lane.drag-handle'), 300, 400)

  for( let k=0; k<nOfTasks; k++ ){
    await page.click('.new-task');
    // write on a task
    const curTask = page.locator('task').nth(k);
    await curTask.click()
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(`${text} ${k}`,{delay:writeDelay});
    expect(curTask).toHaveText(new RegExp(`${text} ${k}`));
  }
  expect(await page.locator('task').count()).toBe(nOfTasks)
});

test.describe.serial('Trep Tracker Tasks & lanes - ', () => {
  test('Task move, indent, outdent', async ({ page }) => {

    // switch position
    await page.keyboard.press('Control+Shift+ArrowDown');
    expect(page.locator('task').nth(1)).toHaveText(new RegExp(text));
    await page.keyboard.press('Control+Shift+ArrowUp');
    expect(page.locator('task').nth(0)).toHaveText(new RegExp(text));
    await page.keyboard.press('Control+Shift+ArrowDown');

    // Child + remove
    await page.keyboard.press('Control+ArrowRight',{delay:200});
    expect(page.locator('.child')).toHaveText(new RegExp(text));
    await page.keyboard.press('Control+ArrowLeft');
    expect(await page.locator('.child').count()).toBe(0)

    await page.keyboard.press('Control+Shift+ArrowUp');
  });
  test('Task drag', async ({ page }) => {
    const handle = tasks.nth(1).locator('[draggable="true"]').first();
    await drag(page, handle, 100, 100 );
    expect(await lanes.count()).toBe(2)
    expect(await firstLane.locator('task').count()).toBe(0)
  })

  test('Task notes', async ({ page }) => {
    // Notes
    const notesToggle = firstTask.locator('.task-notes').first();
    await notesToggle.click();
    const notes = firstTask.locator('notes');
    await expect(notes).toBeVisible();
    await notes.click();
    await page.keyboard.type(text,{delay:writeDelay});
    const toCkech = await notes.locator('textarea').inputValue();
    expect(toCkech).toContain(text);
    await notesToggle.click();
    await expect(notes).toBeHidden();
    await notesToggle.click();
    await expect(notes).toBeVisible();
    const toCkech2 = await notes.locator('textarea').inputValue();
    expect(toCkech2).toContain(text);
  });
  test('Task priority', async () => {
    // priority
    expect(await firstTask.locator('.priority-1').count()).toBe(1)
    const prioritizer = firstTask.locator('prioritizer').first();
    await prioritizer.click(); // expand
    expect(await prioritizer.locator('.priority').count()).toBe(5)
    await prioritizer.locator('.cancel').click();
    expect(await firstTask.locator('.priority-1').count()).toBe(1)
    await prioritizer.click(); // expand
    expect(await prioritizer.locator('.priority').count()).toBe(5)
    await prioritizer.locator('.priority-4').click();
    expect(await firstTask.locator('.priority-4').count()).toBe(1)
    expect(await prioritizer.locator('.priority').count()).toBe(0)

    expect(await menu.locator('.priority-4 div',{hasText:"1"}).count()).toBe(1)

  });
  test('Task status', async () => {
    // status
    expect(await firstTask.locator('.status-todo').count()).toBe(1)
    await firstTaskStatus.click(); // expand
    expect(await firstTaskStatus.locator('.status').count()).toBe(8)
    await firstTaskStatus.locator('.cancel').click();
    expect(await firstTask.locator('.status-todo').count()).toBe(1)
    await firstTaskStatus.click(); // expand
    expect(await firstTaskStatus.locator('.status').count()).toBe(8)
    await firstTaskStatus.locator('.status-completed').click();
    expect(await firstTaskStatus.locator('.status-completed').count()).toBe(1)
    expect(await firstTaskStatus.locator('.status').count()).toBe(1)
    expect(await firstTask.locator('div',{hasText: /completed/}).count()).toBeGreaterThanOrEqual(1)

  });
  test('Task archive', async ({ page }) => {
    // archive
    await firstTaskStatus.click(); // expand
    await firstTaskStatus.locator('.status-archived').click();

    const archive = page.locator('lane',{hasText: /Archive/}).first();
    await expect(archive).toBeVisible();
    expect(await archive.locator('task').count()).toBe(1)

    // unarchive
    const archived = archive.locator('task')
    await archived.locator('status').first().click();
    await archived.locator('.status-waiting').first().click();
    expect(await archive.locator('task').count()).toBe(0)
    expect(await firstLane.locator('task').count()).toBe(nOfTasks)

    // Board task counts
    const menu = page.locator('board-selection-menu');
    expect(await menu.locator('.priority-1 div',{hasText:`${nOfTasks}`}).count()).toBe(1)
  });
  test('Board layouts', async ({ page }) => {
    // Switch layouts
    const toolbar = page.locator('board-toolbar');
    const layouts = toolbar.locator('.layout');
    expect(await layouts.count()).toBe(5)
    for( let i = 0; i<5; i++ ){
      await layouts.nth(i).click(); //flex1

      const count = await lanes.count();

      for (let r = 0; r < count; r++) {
        if( i == 0 ){
          expect(lanes.nth(r)).toHaveCSS('position','absolute')
        }else{
          expect(lanes.nth(r)).not.toHaveCSS('position','absolute');
          expect(await board.locator('.board-column').count()).toBe(i)
        }
      }
      expect(await lanes.count()).toBe(1)
    }

    // search
    const search = page.locator('search');
    await search.click();
    // await search.locator('input').fill(text);
    await page.keyboard.type(text,{delay:writeDelay});

    const toCkech3 = await search.locator('input').inputValue();
    expect(toCkech3).toContain(text);
    // expect(await search.locator('span',{hasText:"1 matches"}).count()).toBe(1) TODO fix

  });
});

async function drag( page: Page, locator: Locator, deltax: number, deltay: number ){
  const dragHandle = locator;
  const box = await dragHandle.boundingBox();
  if (box) {
    // Click and hold at the center of the element
    await dragHandle.hover();
    // await dragHandle.click();
    await page.mouse.down();
  
    // Drag 100px to the right
    await page.mouse.move(box.x + box.width / 2 + deltax, box.y + box.height / 2 + deltay, {steps:100});
  
    // Release the mouse button
    await page.mouse.up();
  
    // Optional: Verify the new position
    const newBox = await dragHandle.boundingBox();
    expect(newBox?.x).toBeCloseTo(box.x + deltax); // Allow some small deviation
  } else {
    throw new Error('Element not found or not visible');
  }
}