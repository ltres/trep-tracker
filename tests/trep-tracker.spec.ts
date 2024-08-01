import { test, expect } from '@playwright/test';

const  text = 'Hello World!';

test('Tasks & lanes - main interactions', async ({ page }) => {
    await page.goto('http://localhost:4200');
  
    // Click the get started link.
    //await page.getByRole('link', { name: 'Get started' }).click();
    
    const modal = page.locator('modal');

    // Assert that the modal is visible
    await expect(modal).toBeVisible();

    await page.click('text=Create a new status file');

    // there is a lane
    await page.waitForSelector('lane');
    expect(await page.locator('lane').count()).toBe(1);

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
    await page.keyboard.type(text);
    expect(firstTask).toHaveText(new RegExp(text));

    // switch position
    await page.keyboard.press('Control+Shift+ArrowDown');
    expect(page.locator('task').nth(1)).toHaveText(new RegExp(text));
    await page.keyboard.press('Control+Shift+ArrowUp');
    expect(page.locator('task').nth(0)).toHaveText(new RegExp(text));
    await page.keyboard.press('Control+Shift+ArrowDown');

    // Child + remove
    await page.keyboard.press('Control+ArrowRight');
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
    await page.keyboard.type(text);
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
    const statuz = firstTask.locator('status').first();
    await statuz.click(); // expand
    expect(await statuz.locator('.status').count()).toBe(8)
    await statuz.locator('.cancel').click();
    expect(await firstTask.locator('.status-todo').count()).toBe(1)
    await statuz.click(); // expand
    expect(await statuz.locator('.status').count()).toBe(8)
    await statuz.locator('.status-completed').click();
    expect(await statuz.locator('.status-completed').count()).toBe(1)
    expect(await statuz.locator('.status').count()).toBe(1)
    console.log(await firstTask.locator('div',{hasText: /completed/}).count())
    expect(await firstTask.locator('div',{hasText: /completed/}).count()).toBeGreaterThanOrEqual(1)

    // archive
    await statuz.click(); // expand
    statuz.locator('.status-archived').click();
    const archive = page.locator('lane',{hasText: /Archive/});
    await expect(archive).toBeVisible();
    expect(await archive.locator('task').count()).toBe(1)

  });
  