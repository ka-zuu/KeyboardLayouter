import { test, expect } from '@playwright/test';
import { waitForKeys, getProject, selectKeyById, clearStorageAndReload } from './helpers';

test.describe('Multi-Legend Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorageAndReload(page);
  });

  test('should allow setting 4 legends (Top, Bottom, Left, Right)', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Keys' }).click();
    await waitForKeys(page, 1);

    // Select key via store (reliable regardless of canvas pan/scale)
    const project = await getProject(page);
    await selectKeyById(page, project.keys[0]!.id);

    const inputTop = page.getByPlaceholder('Top');
    await expect(inputTop).toBeVisible();
    await expect(inputTop).toHaveValue('');
    await expect(page.getByPlaceholder('Bottom')).toHaveValue('');
    await expect(page.getByPlaceholder('Left')).toHaveValue('');
    await expect(page.getByPlaceholder('Right')).toHaveValue('');

    await inputTop.fill('Q');
    await page.getByPlaceholder('Right').fill('W');
    await page.getByPlaceholder('Left').fill('E');
    await page.getByPlaceholder('Bottom').fill('R');

    await expect(inputTop).toHaveValue('Q');
  });

  test('should persist legends after page reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Keys' }).click();
    await waitForKeys(page, 1);

    const project = await getProject(page);
    await selectKeyById(page, project.keys[0]!.id);

    await page.getByPlaceholder('Right').fill('Test');
    await expect(page.getByPlaceholder('Right')).toHaveValue('Test');

    // Wait for debounced IDB write (1000ms) before reload
    await page.waitForTimeout(1500);
    await page.reload();

    // Re-select the key after reload
    await page.waitForFunction(() => window.__mkd_store !== undefined);
    const reloaded = await getProject(page);
    if (reloaded.keys.length > 0) {
      await selectKeyById(page, reloaded.keys[0]!.id);
    }

    await expect(page.getByPlaceholder('Right')).toHaveValue('Test');
  });
});
