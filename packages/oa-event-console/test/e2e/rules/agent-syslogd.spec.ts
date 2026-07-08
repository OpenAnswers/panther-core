import { test, expect } from '../fixtures';

test.describe('Agent - Syslog Rules UI', () => {
  test('should have at least one Syslog Rule', async ({ page }) => {
    await page.goto('/rules/agent/syslogd');
    await expect(page.locator('.card-global-rule-li p.rule-name').first()).toBeVisible({ timeout: 10000 });
  });

  test('Create and Deploy a Rule', async ({ page }) => {
    await page.goto('/rules/agent/syslogd');
    await expect(page.locator('.card-global-rule-li p.rule-name').first()).toBeVisible({ timeout: 10000 });

    const initialCount = await page.locator('ul.rule-set .card-global-rule').count();

    // Click the first visible create button
    const createButtons = page.locator('.btn-rules-global-create-rule');
    const btnCount = await createButtons.count();
    for (let i = 0; i < btnCount; i++) {
      const btn = createButtons.nth(i);
      if (await btn.isVisible()) {
        await btn.click();
        break;
      }
    }
    await expect(page.locator('.card-global-rule-new')).toBeVisible({ timeout: 2000 });

    await page.locator('.card-global-rule-new .rule-name-edit > input').fill('a node');

    // Type one char short of the full verb so the typeahead menu stays open
    // (it auto-selects and closes on exact match with autoSelect:true)
    const operatorInput = page.locator('.card-global-rule-new .select-operator > input');
    await operatorInput.click();
    await operatorInput.pressSequentially('equal', { delay: 20 });
    await expect(page.locator('.card-global-rule-new .select-operator > .dropdown-menu')).toBeVisible({
      timeout: 2000,
    });
    await page
      .locator('.card-global-rule-new .select-operator > .dropdown-menu > li > a', { hasText: /^equals$/ })
      .click();

    const equalsField = page.locator('.card-global-rule-new .input-verb-select-equals-field');
    await equalsField.waitFor({ state: 'attached', timeout: 5000 });
    await equalsField.scrollIntoViewIfNeeded();
    await equalsField.click();
    await equalsField.fill('nod');
    await expect(page.locator('.card-global-rule-new .select-field > .dropdown-menu')).toBeVisible({ timeout: 1000 });
    await page.locator('.card-global-rule-new .select-field > .dropdown-menu > li > a').first().click();

    const equalsValues = page.locator('.card-global-rule-new .input-verb-select-equals-values');
    await equalsValues.waitFor({ state: 'attached', timeout: 5000 });
    await equalsValues.fill('a node equals this');

    const actionOperatorInput = page.locator('.card-global-rule-new .action-operator > input');
    await actionOperatorInput.waitFor({ state: 'attached', timeout: 5000 });
    await actionOperatorInput.scrollIntoViewIfNeeded();
    await actionOperatorInput.click();
    // Same one-char-short trick as the select operator to keep the typeahead open
    await actionOperatorInput.pressSequentially('se', { delay: 20 });
    await expect(page.locator('.card-global-rule-new .action-operator > .dropdown-menu')).toBeVisible({
      timeout: 2000,
    });
    await page
      .locator('.card-global-rule-new .action-operator > .dropdown-menu > li > a', { hasText: /^set$/ })
      .click();

    const actionFieldInput = page.locator('.card-global-rule-new .action-field > input');
    await actionFieldInput.waitFor({ state: 'attached', timeout: 5000 });
    await actionFieldInput.fill('node');

    const actionValueInput = page.locator('.card-global-rule-new .action-value > input');
    await actionValueInput.waitFor({ state: 'attached', timeout: 5000 });
    await actionValueInput.fill('a node equals this');

    const saveBtn = page.locator('.card-global-rule-new .edit-warning .button-update');
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();
    await expect(page.locator('ul.rule-set .card-global-rule')).toHaveCount(initialCount + 1, { timeout: 5000 });

    // Deploy: the nav deploy banner is hidden (class `hidden`) until a rule is unsaved
    const deployBanner = page.locator('.nav-quick-deploy');
    await expect(deployBanner).not.toHaveClass(/\bhidden\b/, { timeout: 5000 });
    await deployBanner.locator('.btn-success').click();
  });
});
