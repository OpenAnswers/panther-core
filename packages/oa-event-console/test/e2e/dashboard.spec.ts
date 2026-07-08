import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test('changes to the Dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should populate the console name', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('#console-name')).toHaveText('test');
  });

  // Regression: the inventory widget bundle called w2_add_default_escape_render
  // which lived only in the console bundle (not loaded on /dashboard), so the
  // w2grid was never initialised and the inventory list silently stayed empty.
  test('should initialise the inventory w2grid', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('/dashboard');

    // w2ui only creates #grid_<name>_body once .w2grid() has run successfully.
    await expect(page.locator('#grid_inventory-grid_body')).toBeVisible({ timeout: 3000 });

    expect(pageErrors, `page errors: ${pageErrors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });
});
