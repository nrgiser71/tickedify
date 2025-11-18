const { test, expect } = require('@playwright/test');

test.describe('Postponed Tasks Clickability', () => {
    test.beforeEach(async ({ page }) => {
        // Login to dev.tickedify.com
        await page.goto('https://dev.tickedify.com/app');
        await page.fill('#email', 'jan@buskens.be');
        await page.fill('#password', 'qyqhut-muDvop-fadki9');
        await page.click('#loginBtn');

        // Wait for login to complete
        await page.waitForURL('**/app#*');

        // Navigate to postponed screen
        await page.click('a[href="#uitgesteld"]');
        await page.waitForSelector('.uitgesteld-accordion');
    });

    test('T004.1: Click postponed task opens modal', async ({ page }) => {
        // Expand weekly section
        await page.click('[data-category="uitgesteld-wekelijks"] .sectie-header');

        // Wait for tasks to load
        await page.waitForSelector('#lijst-uitgesteld-wekelijks li', { timeout: 5000 });

        // Click first task
        await page.click('#lijst-uitgesteld-wekelijks li:first-child .taak-content');

        // Verify modal opens
        const modal = page.locator('#planningPopup');
        await expect(modal).toBeVisible();

        // Verify form fields are populated
        const taskName = await page.locator('#taakNaamInput').inputValue();
        expect(taskName).not.toBe('');
    });

    test('T004.2: Edit task and save keeps it in postponed list', async ({ page }) => {
        // Setup: Click task to open modal
        await page.click('[data-category="uitgesteld-wekelijks"] .sectie-header');
        await page.waitForSelector('#lijst-uitgesteld-wekelijks li', { timeout: 5000 });

        // Get original task text for verification
        const originalText = await page.locator('#lijst-uitgesteld-wekelijks li:first-child .taak-tekst').textContent();

        await page.click('#lijst-uitgesteld-wekelijks li:first-child .taak-content');

        // Wait for modal to be visible
        await expect(page.locator('#planningPopup')).toBeVisible();

        // Edit task name
        const testSuffix = ` - Test ${Date.now()}`;
        await page.fill('#taakNaamInput', originalText + testSuffix);

        // Save
        await page.click('#maakActieBtn');

        // Wait for modal to close
        await expect(page.locator('#planningPopup')).not.toBeVisible({ timeout: 3000 });

        // Verify task still in weekly postponed list
        const updatedTask = page.locator('#lijst-uitgesteld-wekelijks li:first-child .taak-tekst');
        await expect(updatedTask).toContainText(testSuffix);
    });

    test('T004.3: Change due date does not auto-move task', async ({ page }) => {
        // Setup: Click task
        await page.click('[data-category="uitgesteld-wekelijks"] .sectie-header');
        await page.waitForSelector('#lijst-uitgesteld-wekelijks li', { timeout: 5000 });

        const taskCountBefore = await page.locator('#lijst-uitgesteld-wekelijks li').count();

        await page.click('#lijst-uitgesteld-wekelijks li:first-child .taak-content');

        // Wait for modal
        await expect(page.locator('#planningPopup')).toBeVisible();

        // Change due date to today
        const today = new Date().toISOString().split('T')[0];
        await page.fill('#verschijndatum', today);

        // Save
        await page.click('#maakActieBtn');
        await expect(page.locator('#planningPopup')).not.toBeVisible({ timeout: 3000 });

        // Wait a moment for any potential list updates
        await page.waitForTimeout(500);

        // Verify task count unchanged in weekly list (or at least >=1)
        const taskCountAfter = await page.locator('#lijst-uitgesteld-wekelijks li').count();
        expect(taskCountAfter).toBeGreaterThanOrEqual(1);

        // Verify task count hasn't decreased (critical - task not auto-moved)
        expect(taskCountAfter).toBe(taskCountBefore);
    });

    test('T004.4: Drag and drop still works', async ({ page }) => {
        // This test verifies click doesn't break drag & drop
        await page.click('[data-category="uitgesteld-wekelijks"] .sectie-header');
        await page.click('[data-category="uitgesteld-maandelijks"] .sectie-header');

        await page.waitForSelector('#lijst-uitgesteld-wekelijks li', { timeout: 5000 });

        // Get task element
        const task = page.locator('#lijst-uitgesteld-wekelijks li:first-child');
        const taskText = await task.locator('.taak-tekst').textContent();

        // Drag to monthly section header (drop zone)
        const monthlyHeader = page.locator('[data-category="uitgesteld-maandelijks"] .sectie-header');
        await task.dragTo(monthlyHeader);

        // Wait for drag operation to complete
        await page.waitForTimeout(1000);

        // Verify task moved to monthly
        await page.waitForSelector('#lijst-uitgesteld-maandelijks li', { timeout: 3000 });
        const monthlyTasks = await page.locator('#lijst-uitgesteld-maandelijks .taak-tekst').allTextContents();

        expect(monthlyTasks.some(text => text.includes(taskText.replace(/<[^>]*>/g, '').trim()))).toBeTruthy();

        // Verify no modal opened during drag
        await expect(page.locator('#planningPopup')).not.toBeVisible();
    });
});
