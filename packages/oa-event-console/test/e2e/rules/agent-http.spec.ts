import { test, expect } from '../fixtures';

test.describe('Agent - HTTP Rules UI', () => {
  test('should have at least one HTTP Rule', async ({ page }) => {
    await page.goto('/rules/agent/http');
    await expect(page.locator('.card-global-rule-li p.rule-name').first()).toBeVisible({ timeout: 10000 });
  });
});
