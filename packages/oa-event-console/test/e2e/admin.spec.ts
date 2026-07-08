import { test, expect } from './fixtures';

test.describe('Admin', () => {
  test('changes to the Admin page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('Console Users - checks card presence', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('#admin-users-content')).toBeVisible({ timeout: 1000 });
  });

  test('Console Users - CRUD flow', async ({ page }) => {
    const ruid = Math.floor(Math.random() * 90) + 10;
    const dataUser = `testwebd${ruid}`;
    const rowSel = `tr.admin-user-row[data-user="${dataUser}"]`;

    await page.goto('/admin');
    await page.locator('#admin-users-create').waitFor({ timeout: 2000 });
    await page.locator('#admin-users-create input[name="username"]').fill(dataUser);
    await page.locator('#admin-users-create input[name="email"]').fill(`support+test${ruid}@openanswers.co.uk`);
    await page.locator('#admin-users-create select[name="group"]').selectOption({ value: 'admin' });
    await page.locator('#admin-user-create-submit').scrollIntoViewIfNeeded();
    await page.locator('#admin-user-create-submit').click();
    await expect(page.locator(rowSel)).toBeVisible({ timeout: 2000 });

    // Edit row, then cancel
    await page.locator(rowSel).click();
    await page.locator(`tr[data-user="${dataUser}"] .admin-user-row-cancel`).waitFor({ timeout: 1000 });
    await page.locator(`tr[data-user="${dataUser}"] .admin-user-row-cancel`).click();

    // Edit email and save
    await page.locator(rowSel).click();
    await page
      .locator(`tr.admin-user-row-edit[data-user="${dataUser}"] input[name="email"]`)
      .waitFor({ timeout: 2000 });
    await page.locator(`tr.admin-user-row-edit[data-user="${dataUser}"] input[name="email"]`).fill('new@email.com');
    await page.locator(`tr[data-user="${dataUser}"] .admin-user-row-save`).click();
    await expect(page.locator(rowSel)).toBeVisible({ timeout: 2000 });
    await expect(page.locator(`${rowSel} td:nth-child(2)`)).toHaveText('new@email.com');

    // Delete
    await page.locator(rowSel).click();
    await page.locator(`tr[data-user="${dataUser}"] .admin-user-row-delete`).waitFor({ timeout: 2000 });
    await page.locator(`tr[data-user="${dataUser}"] .admin-user-row-delete`).click();
    await expect(page.locator(rowSel)).not.toBeVisible({ timeout: 2000 });
  });

  test('Event Logger Configuration Download - checks card presence', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('#admin-downloads-content')).toBeVisible({ timeout: 3000 });
  });

  test('API Keys - checks card presence', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('#admin-apikeys-content')).toBeVisible({ timeout: 1000 });
  });

  test('API Keys - create and delete', async ({ page }) => {
    await page.goto('/admin');
    // Wait for the socket-driven apikeys table to populate before counting
    await expect(page.locator('#admin-apikeys-table .admin-apikey-row').first()).toBeVisible({ timeout: 5000 });
    const initialCount = await page.locator('.admin-apikey-row').count();

    await page.locator('#admin-apikey-create-submit').click();
    await expect(page.locator('.admin-apikey-row')).toHaveCount(initialCount + 1, { timeout: 5000 });

    const apikey = await page
      .locator('#admin-apikeys-table tr.admin-apikey-row-edit')
      .last()
      .getAttribute('data-apikey');
    expect(apikey).toHaveLength(32);
    expect(apikey).toMatch(/^[a-z0-9]+$/i);

    const rowSel = `tr.admin-apikey-row[data-apikey="${apikey}"]`;
    const editRowSel = `tr.admin-apikey-row-edit[data-apikey="${apikey}"]`;
    await page.locator(rowSel).click();
    await expect(page.locator(editRowSel)).toBeVisible();
    await page.locator(`${editRowSel} .admin-apikey-row-delete`).click();
    await expect(page.locator('.admin-apikey-row')).toHaveCount(initialCount, { timeout: 5000 });
  });
});
