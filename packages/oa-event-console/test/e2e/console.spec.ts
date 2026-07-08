import type { Page } from '@playwright/test';

import { test, expect } from './fixtures';

const FIRST_RECORD = '#grid_event_grid_records tr[line="1"]';
const FIRST_FIELD = 'td[col="0"]';
const FIRST_RECORD_FIRST_FIELD = `${FIRST_RECORD} ${FIRST_FIELD}`;
const SECOND_RECORD = '#grid_event_grid_records tr[line="2"]';
const SECOND_FIELD = 'td[col="1"]';
const SECOND_RECORD_SECOND_FIELD = `${SECOND_RECORD} ${SECOND_FIELD}`;

// The default console view filters by owner/ack state; switching to All keeps
// rows visible after assign/ack/etc. so tests can still locate them by recid.
async function selectAllView(page: Page) {
  const viewButton = page.locator('div.console-toolbar-views > div.section-dropdown > .dropdown > button');
  await viewButton.click();
  await page.locator('a[data-viewname="All"]').waitFor({ state: 'visible', timeout: 1500 });
  await page.locator('a[data-viewname="All"]').click();
  await expect(viewButton).toHaveText(/All/, { timeout: 1500 });
}

test.describe('The Consoles', () => {
  test('has a grid', async ({ page }) => {
    await page.goto('/console');
    await expect(page.locator('#grid_event_grid_body')).toBeVisible({ timeout: 2000 });
  });

  test.describe('Default View events', () => {
    test('should have a first record', async ({ page }) => {
      await page.goto('/console');
      await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
      await expect(page.locator(FIRST_RECORD)).toBeVisible({ timeout: 3000 });
    });

    test('should have a second record', async ({ page }) => {
      await page.goto('/console');
      await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
      await expect(page.locator(SECOND_RECORD)).toBeVisible({ timeout: 3000 });
    });

    test('first record should have a severity class', async ({ page }) => {
      await page.goto('/console');
      await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
      await page.locator(FIRST_RECORD).waitFor({ timeout: 3000 });
      const cls = await page.locator(FIRST_RECORD).getAttribute('class');
      expect(cls).toMatch(/severity-\d+/i);
    });
  });

  test.describe('All View', () => {
    test('should set the All view and show records', async ({ page }) => {
      await page.goto('/console');
      await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });

      await page.locator('div.console-toolbar-views > div.section-dropdown > .dropdown > button').click();
      await page.locator('a[data-viewname="All"]').waitFor({ state: 'visible' });
      await page.locator('a[data-viewname="All"]').click();
      await expect(page.locator('div.console-toolbar-views > div.section-dropdown > .dropdown > button')).toHaveText(
        /All/,
        { timeout: 1500 }
      );

      await expect(page.locator(FIRST_RECORD)).toBeVisible({ timeout: 2000 });
    });

    test.describe('Context menu', () => {
      test('clears the second record', async ({ page }) => {
        await page.goto('/console');
        await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
        await page.locator(SECOND_RECORD).waitFor({ timeout: 3000 });

        await page.locator('body').click();
        await page.locator(SECOND_RECORD_SECOND_FIELD).click({ button: 'right' });
        await page.locator('#console-context-menu').waitFor({ state: 'visible', timeout: 1000 });
        await page.locator("#console-context-menu a[action='clear']").click();
        await page.locator('#console-context-menu').waitFor({ state: 'hidden', timeout: 1000 });
        await expect(page.locator(SECOND_RECORD)).toHaveClass(/severity-0/, { timeout: 3000 });
      });

      test('pops up and closes the context menu', async ({ page }) => {
        await page.goto('/console');
        await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
        await page.locator(SECOND_RECORD).waitFor({ timeout: 3000 });

        await page.locator('body').click();
        const cls = await page.locator(FIRST_RECORD).getAttribute('class');
        expect(cls).not.toMatch(/w2ui-selected/);
        expect(cls).toMatch(/severity-/);

        await page.locator(SECOND_RECORD_SECOND_FIELD).click({ button: 'right' });
        await page.locator('#console-context-menu').waitFor({ state: 'visible', timeout: 1000 });
        await expect(page.locator('#console-context-menu')).toBeVisible();
      });

      test('acknowledges and unacknowledges the first record', async ({ page }) => {
        await page.goto('/console');
        await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
        await selectAllView(page);
        await page.locator(FIRST_RECORD).waitFor({ timeout: 3000 });

        const recid = await page.locator(FIRST_RECORD).getAttribute('recid');
        const rowByRecid = (id: string) => page.locator(`#grid_event_grid_records tr[recid="${id}"]`);

        // Acknowledge
        await page.locator('body').click();
        await page.locator(FIRST_RECORD_FIRST_FIELD).click({ button: 'right' });
        await page.locator('#console-context-menu').waitFor({ state: 'visible', timeout: 1000 });
        await page.locator("#console-context-menu a[action='acknowledge']").click();
        await page.locator('#console-context-menu').waitFor({ state: 'hidden', timeout: 1000 });
        await expect(rowByRecid(recid!)).toHaveClass(/\backnowledged\b/, { timeout: 3000 });

        // Unacknowledge — ack'd row may be scrolled out of the virtualised viewport.
        // Click() auto-scrolls and auto-retries action-ability checks, which handles
        // w2ui's transient detach/re-attach during re-render.
        await page.locator('body').click();
        const targetRow = rowByRecid(recid!);
        await targetRow.locator(FIRST_FIELD).click({ button: 'right' });
        await page.locator('#console-context-menu').waitFor({ state: 'visible', timeout: 1000 });
        await page.locator("#console-context-menu a[action='unacknowledge']").click();
        await page.locator('#console-context-menu').waitFor({ state: 'hidden', timeout: 1000 });
        await expect(rowByRecid(recid!)).toHaveClass(/\bunacknowledged\b/, { timeout: 3000 });
      });

      test('assigns the first record to test1', async ({ page }) => {
        await page.goto('/console');
        await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
        await selectAllView(page);
        await page.locator(FIRST_RECORD).waitFor({ timeout: 3000 });

        const recid = await page.locator(FIRST_RECORD).getAttribute('recid');
        const targetRow = page.locator(`#grid_event_grid_records tr[recid="${recid}"]`);
        const firstText = await targetRow.textContent();

        await page.locator('body').click();
        await page.locator(FIRST_RECORD_FIRST_FIELD).click({ button: 'right' });
        await page.locator('#console-context-menu').waitFor({ state: 'visible', timeout: 1000 });
        await page.locator('.console-context-assign').hover();
        await page.locator('a[action="assign"][user="test1"]').waitFor({ state: 'visible' });
        await page.locator('a[action="assign"][user="test1"]').click();

        await expect(targetRow).toContainText('test1', { timeout: 3000 });
        const updatedText = await targetRow.textContent();
        expect(updatedText).not.toEqual(firstText);
      });

      test('deletes the first record', async ({ page }) => {
        await page.goto('/console');
        await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
        await selectAllView(page);
        await page.locator(FIRST_RECORD).waitFor({ timeout: 3000 });

        const recid = await page.locator(FIRST_RECORD).getAttribute('recid');

        await page.locator('body').click();
        await page.locator(FIRST_RECORD_FIRST_FIELD).click({ button: 'right' });
        await page.locator('#console-context-menu').waitFor({ state: 'visible', timeout: 1000 });
        await page.locator('.console-context-tools').hover();
        await page.locator('a[action="delete"]').hover();
        await page.locator('a[action="delete"]').waitFor({ state: 'visible', timeout: 1000 });
        await page.locator('a[action="delete"]').click();
        await expect(page.locator('#console-context-menu')).not.toBeVisible();

        // Row should be removed from the grid (async round-trip to server)
        await expect(page.locator(`#grid_event_grid_records tr[recid="${recid}"]`)).toHaveCount(0, { timeout: 3000 });
      });
    });

    test.describe('Event detail', () => {
      test('displays and closes the modal', async ({ page }) => {
        await page.goto('/console');
        await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
        await selectAllView(page);
        await page.locator(SECOND_RECORD).waitFor({ timeout: 3000 });

        await page.locator(SECOND_RECORD).dblclick();
        await page.locator('#event-details-modal').waitFor({ state: 'visible' });

        await page.locator('#event-details-modal button.btn[data-dismiss="modal"]').click();
        await page.locator('#event-details-modal').waitFor({ state: 'hidden', timeout: 1000 });

        const cls = await page.locator(FIRST_RECORD).getAttribute('class');
        expect(cls).toMatch(/severity-/i);
      });

      test('toggles event to acknowledged via modal', async ({ page }) => {
        await page.goto('/console');
        await page.locator('#grid_event_grid_body').waitFor({ timeout: 2000 });
        await selectAllView(page);
        await page.locator(SECOND_RECORD).waitFor({ timeout: 3000 });

        const recid = await page.locator(SECOND_RECORD).getAttribute('recid');
        const targetRow = page.locator(`#grid_event_grid_records tr[recid="${recid}"]`);

        await page.locator(SECOND_RECORD).dblclick();
        await page.locator('#event-details-modal').waitFor({ state: 'visible' });
        await page.locator('button.event-detail-acknowledge').click();
        await expect(page.locator('button.event-detail-unacknowledge')).toBeVisible();

        // Row should have the 'acknowledged' class once the grid re-renders
        await expect(targetRow).toHaveClass(/\backnowledged\b/, { timeout: 3000 });

        await page.locator('#event-details-modal button.btn[data-dismiss="modal"]').click();
        await page.locator('#event-details-modal').waitFor({ state: 'hidden', timeout: 1000 });
      });
    });
  });
});
