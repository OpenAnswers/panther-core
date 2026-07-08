import { test, expect } from '../fixtures';

test.describe('Group Rules UI', () => {
  test('should have at least one Group', async ({ page }) => {
    await page.goto('/rules/groups');
    await expect(page.locator('.rule-group-title').first()).toBeVisible({ timeout: 6000 });
  });

  test('should have at least one Group Rule', async ({ page }) => {
    await page.goto('/rules/groups');
    const badge = page.locator('.rule-badge-rules-hit.group-rules span').first();
    await expect(badge).toBeVisible({ timeout: 10000 });
    const count = parseInt((await badge.textContent()) ?? '0', 10);
    expect(count).toBeGreaterThan(0);
  });
});
