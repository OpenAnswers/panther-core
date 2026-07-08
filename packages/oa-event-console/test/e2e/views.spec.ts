import { test, expect } from './fixtures';

test.describe('Views Manager', () => {
  test('should have an Add button', async ({ page }) => {
    await page.goto('/views');
    await expect(page.locator('#admin-field-create-submit')).toBeVisible({ timeout: 3000 });
  });
});
