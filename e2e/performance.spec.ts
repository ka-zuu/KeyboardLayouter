import { test, expect, Page } from '@playwright/test';
import { clearStorageAndReload } from './helpers';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorageAndReload(page);
  });

  async function addKeys(page: Page, count: number) {
    const maxPerBatch = 20;
    const batches = Math.ceil(count / maxPerBatch);
    const countInput = page.locator('div').filter({ hasText: /^Count:$/ }).getByRole('spinbutton');
    const addButton = page.getByRole('button', { name: 'Add Keys' });

    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(count - i * maxPerBatch, maxPerBatch);
      await countInput.fill(batchSize.toString());
      await addButton.click();
    }
  }

  test('should add 50 keys within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await addKeys(page, 50);

    await page.waitForFunction(
      () => (window.__mkd_store?.getState()?.project?.keys?.length ?? 0) === 50
    );

    const duration = Date.now() - startTime;
    console.log(`Time to add 50 keys: ${duration}ms`);
    expect(duration).toBeLessThan(5000);
  });

  test('should drag a key smoothly with 50 keys present', async ({ page }) => {
    await addKeys(page, 50);
    await page.waitForFunction(
      () => (window.__mkd_store?.getState()?.project?.keys?.length ?? 0) === 50
    );

    const firstKeyPos = await page.evaluate(
      () => window.__mkd_store!.getState().project.keys[0]!.position
    );

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const startX = box.x + firstKeyPos.x * 60 + 30;
    const startY = box.y + firstKeyPos.y * 60 + 30;

    const startTime = Date.now();
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 100, { steps: 10 });
    await page.mouse.up();

    const duration = Date.now() - startTime;
    console.log(`Time to drag a key with 50 keys: ${duration}ms`);
    expect(duration).toBeLessThan(2000);
  });
});
