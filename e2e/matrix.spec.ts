import { test, expect } from '@playwright/test';
import { waitForKeys, getProject, clearSelection, clearStorageAndReload } from './helpers';

test.describe('Matrix Auto-Assignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorageAndReload(page);
    await expect(page.getByRole('button', { name: 'Add Keys' })).toBeVisible();
  });

  test('should auto-assign matrix values based on visual position with default (0,0)', async ({ page }) => {
    const countInput = page.locator('div').filter({ hasText: /^Count:$/ }).getByRole('spinbutton');
    await countInput.fill('3');
    await page.getByRole('button', { name: 'Add Keys' }).click();
    await waitForKeys(page, 3);

    // Clear selection via store (canvas click unreliable with stacked Konva layers)
    await clearSelection(page);

    const startRowInput = page.getByTestId('matrix-start-row');
    await expect(startRowInput).toBeVisible();
    await expect(startRowInput).toHaveValue('0');

    await page.getByRole('button', { name: 'Auto-assign Matrix (All)' }).click();

    const project = await getProject(page);
    const sorted = [...project.keys].sort((a, b) => a.position.x - b.position.x);

    expect(sorted[0]!.matrix).toEqual({ row: 0, col: 0 });
    expect(sorted[1]!.matrix).toEqual({ row: 0, col: 1 });
    expect(sorted[2]!.matrix).toEqual({ row: 0, col: 2 });
  });

  test('should auto-assign matrix with custom start row/col', async ({ page }) => {
    const countInput = page.locator('div').filter({ hasText: /^Count:$/ }).getByRole('spinbutton');
    await countInput.fill('3');
    await page.getByRole('button', { name: 'Add Keys' }).click();
    await waitForKeys(page, 3);

    await clearSelection(page);

    const startRowInput = page.getByTestId('matrix-start-row');
    const startColInput = page.getByTestId('matrix-start-col');
    await startRowInput.fill('4');
    await startColInput.fill('4');

    await page.getByRole('button', { name: 'Auto-assign Matrix (All)' }).click();

    const project = await getProject(page);
    const sorted = [...project.keys].sort((a, b) => a.position.x - b.position.x);

    expect(sorted[0]!.matrix).toEqual({ row: 4, col: 4 });
    expect(sorted[1]!.matrix).toEqual({ row: 4, col: 5 });
    expect(sorted[2]!.matrix).toEqual({ row: 4, col: 6 });
  });
});
