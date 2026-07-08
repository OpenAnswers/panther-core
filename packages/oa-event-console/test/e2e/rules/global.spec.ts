import { test, expect } from '../fixtures';

test.describe('Rules UI - Global', () => {
  test('should have at least one Global Rule', async ({ page }) => {
    await page.goto('/rules/globals');
    await expect(page.locator('#rules-container .card-global-rule').first()).toBeVisible({ timeout: 6000 });
  });
});
