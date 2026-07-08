import { test, expect } from './fixtures';

test.describe('API Console', () => {
  test('should have a Send button', async ({ page }) => {
    await page.goto('/apiconsole');
    await expect(page.locator('#btn-send')).toBeVisible({ timeout: 1000 });
  });
});
