import { test, expect } from '@playwright/test';
import { waitForKeys, getProject, selectKeyById, clearStorageAndReload, setPan } from './helpers';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorageAndReload(page);
    await page.click('button:has-text("Add Keys")');
    await waitForKeys(page, 1);
    // Move pan so key at (0,0) is visible
    await setPan(page, 100, 100);
  });

  test('should delete selected key with Delete/Backspace', async ({ page }) => {
    const project = await getProject(page);
    await selectKeyById(page, project.keys[0]!.id);

    await page.keyboard.press('Delete');

    await page.waitForFunction(
      () => (window.__mkd_store?.getState()?.project?.keys?.length ?? -1) === 0
    );
  });

  test('should move selected key with Arrow keys', async ({ page }) => {
    const project = await getProject(page);
    await selectKeyById(page, project.keys[0]!.id);

    const initialPos = project.keys[0]!.position;

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    const afterRight = await getProject(page).then(p => p.keys[0]!.position);
    expect(afterRight.x).toBeGreaterThan(initialPos.x);
    expect(afterRight.y).toBe(initialPos.y);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    const afterDown = await getProject(page).then(p => p.keys[0]!.position);
    expect(afterDown.y).toBeGreaterThan(afterRight.y);
  });

  test('should copy and paste keys', async ({ page }) => {
    const project = await getProject(page);
    await selectKeyById(page, project.keys[0]!.id);

    await page.keyboard.press('Meta+c');
    await page.keyboard.press('Meta+v');

    await page.waitForFunction(
      () => (window.__mkd_store?.getState()?.project?.keys?.length ?? 0) === 2
    );

    // Pasted key is selected — delete it
    await page.keyboard.press('Delete');

    await page.waitForFunction(
      () => (window.__mkd_store?.getState()?.project?.keys?.length ?? 0) === 1
    );
  });

  test('should not trigger shortcuts when typing in input', async ({ page }) => {
    const project = await getProject(page);
    await selectKeyById(page, project.keys[0]!.id);

    const nameInput = page.locator('input[placeholder="Project Name"]');
    await nameInput.click();
    await nameInput.fill('Test');
    await page.keyboard.press('Backspace');

    // Key should still exist
    const keyCount = await getProject(page).then(p => p.keys.length);
    expect(keyCount).toBe(1);

    await expect(nameInput).toHaveValue('Tes');
  });
});
