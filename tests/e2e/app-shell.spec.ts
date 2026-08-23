import { test, expect } from '@playwright/test';

test('アプリの枠が表示され、コンソールエラーが出ない', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/');

  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.getByTestId('toolbar')).toBeVisible();
  await expect(page.getByTestId('left-panel')).toBeVisible();
  await expect(page.getByTestId('canvas-area')).toBeVisible();
  await expect(page.getByTestId('inspector')).toBeVisible();
  await expect(page.getByTestId('status-bar')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
