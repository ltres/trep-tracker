import { test, expect } from '@playwright/test';

const  text = 'Hello World!';
let  lanes;
let  firstLane ;
let firstTask;
let statuz;

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:4200'); 
  lanes = page.locator('lane');
  firstLane = lanes.first();
  firstTask = page.locator('task').first();
  statuz = firstTask.locator('status').first();
});

test.describe.serial('Trep Tracker Tasks & lanes - ', () => {
  test('Main interactions', async ({ page }) => {
    
    // Click the get started link.
    //await page.getByRole('link', { name: 'Get started' }).click();
    
    const modal = page.locator('modal');

    // Assert that the modal is visible
    await expect(modal).toBeVisible();
    await page.click('text=Create a new status file');

    // there is a lane
    await page.waitForSelector('lane');
    const lanes = page.locator('lane');
    expect(await lanes.count()).toBe(1);

    // Drag
    const dragHandle = firstLane.locator('.drag-handle');
    const box = await dragHandle.boundingBox();
    if (box) {
      // Click and hold at the center of the element
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
    
      // Drag 100px to the right
      await page.mouse.move(box.x + box.width / 2 + 400, box.y + box.height / 2 + 300);
    
      // Release the mouse button
      await page.mouse.up();
    
      // Optional: Verify the new position
      const newBox = await dragHandle.boundingBox();
      expect(newBox?.x).toBeCloseTo(box.x + 400); // Allow some small deviation
    } else {
      throw new Error('Element not found or not visible');
    }

    // add a task
    await page.click('lane button');
    await page.waitForSelector('task');
    expect(await page.locator('task').count()).toBe(1);
    await page.click('lane button');
    expect(await page.locator('task').count()).toBe(2);

    // write on a task
    const firstTask = page.locator('task').first();
    await firstTask.click()
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(text,{delay:50});
    expect(firstTask).toHaveText(new RegExp(text));

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

    // Notes
    const notesToggle = page.locator('.task-notes').first();
    await notesToggle.click();
    const notes = page.locator('notes');
    await expect(notes).toBeVisible();
    await notes.click();
    await page.keyboard.type(text,{delay:50});
    const toCkech = await notes.locator('textarea').inputValue();
    expect(toCkech).toContain(text);
    await notesToggle.click();
    await expect(notes).toBeHidden();
    await notesToggle.click();
    await expect(notes).toBeVisible();
    const toCkech2 = await notes.locator('textarea').inputValue();
    expect(toCkech2).toContain(text);

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

    // status
    expect(await firstTask.locator('.status-todo').count()).toBe(1)
    await statuz.click(); // expand
    expect(await statuz.locator('.status').count()).toBe(8)
    await statuz.locator('.cancel').click();
    expect(await firstTask.locator('.status-todo').count()).toBe(1)
    await statuz.click(); // expand
    expect(await statuz.locator('.status').count()).toBe(8)
    await statuz.locator('.status-completed').click();
    expect(await statuz.locator('.status-completed').count()).toBe(1)
    expect(await statuz.locator('.status').count()).toBe(1)
    expect(await firstTask.locator('div',{hasText: /completed/}).count()).toBeGreaterThanOrEqual(1)

    // archive
    await statuz.click(); // expand
    await statuz.locator('.status-archived').click();
    const archive = page.locator('lane',{hasText: /Archive/});
    await expect(archive).toBeVisible();
    expect(await archive.locator('task').count()).toBe(1)

    // unarchive
    const archived = archive.locator('task')
    await archived.locator('status').first().click();
    await archived.locator('.status-waiting').first().click();
    expect(await archive.locator('task').count()).toBe(0)
    expect(await firstLane.locator('task').count()).toBe(2)

    // Board task counts
    const menu = page.locator('board-selection-menu');
    expect(await menu.locator('.priority-1 div',{hasText:"1"}).count()).toBe(1)
    expect(await menu.locator('.priority-4 div',{hasText:"1"}).count()).toBe(1)

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
          expect(lanes.nth(r)).not.toHaveCSS('position','absolute')
        }
      }
      expect(await lanes.count()).toBe(2)
    }

    // search
    const search = page.locator('search');
    await search.click();
    // await search.locator('input').fill(text);
    await page.keyboard.type(text,{delay:50});

    const toCkech3 = await search.locator('input').inputValue();
    expect(toCkech3).toContain(text);
    // expect(await search.locator('span',{hasText:"1 matches"}).count()).toBe(1) TODO fix

  });
});