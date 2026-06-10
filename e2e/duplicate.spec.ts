import { test, expect } from '@playwright/test';
import { waitForKeys, getProject, selectKeyById, clearStorageAndReload } from './helpers';

test.describe('Key Duplication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorageAndReload(page);
    await page.click('button:has-text("Add Keys")');
    await waitForKeys(page, 1);

    // Select first key via store action (no reload needed)
    const project = await getProject(page);
    await selectKeyById(page, project.keys[0]!.id);
  });

  test('duplicating a key should select the new key', async ({ page }) => {
    const initialProject = await getProject(page);
    const initialKey = initialProject.keys[0]!;
    const initialCount = initialProject.keys.length;

    await page.getByRole('button', { name: 'Duplicate' }).click();

    await page.waitForFunction(
      (n) => (window.__mkd_store?.getState()?.project?.keys?.length ?? 0) === n + 1,
      initialCount
    );

    await expect(page.getByText('Properties', { exact: true })).toBeVisible();

    const expectedX = initialKey.position.x + 0.25; // gridSize default
    const expectedY = initialKey.position.y + 0.25;

    if (expectedX === expectedY) {
      await expect(page.locator(`input[value="${expectedX}"]`)).toHaveCount(2);
    } else {
      await expect(page.locator(`input[value="${expectedX}"]`)).toBeVisible();
      await expect(page.locator(`input[value="${expectedY}"]`)).toBeVisible();
    }
  });

  test('duplicating multiple keys should select all new keys', async ({ page }) => {
    await page.click('button:has-text("Add Keys")');
    await waitForKeys(page, 2);

    const project = await getProject(page);
    await selectKeyById(page, project.keys[0]!.id);
    await selectKeyById(page, project.keys[1]!.id, true);

    const initialKeys = await getProject(page).then(p => p.keys);

    await page.getByRole('button', { name: 'Duplicate' }).click();

    await page.waitForFunction(
      (n) => (window.__mkd_store?.getState()?.project?.keys?.length ?? 0) === n + 2,
      initialKeys.length
    );

    await expect(page.getByText('2 items selected')).toBeVisible();
  });
});
