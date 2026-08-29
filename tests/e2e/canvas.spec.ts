import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/**
 * `window.__APP_TEST__` のようなテスト専用フックは本番ビルドに含めない方針
 * (docs/TESTING.md#ストアへのアクセス)。代わりに `localStorage` へ直接
 * プロジェクトを仕込み、アプリの通常の復元経路 (appStorage のフォールバック →
 * useBootstrap) を通して描画させる。IndexedDB は各テストとも空のプロファイルで
 * 始まるため、appStorage は自然に localStorage へフォールバックする。
 */
const fixturePath = fileURLToPath(new URL('../fixtures/layouts/4x4-macropad.json', import.meta.url));
const project = JSON.parse(readFileSync(fixturePath, 'utf-8')) as { id: string; keys: unknown[] };

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript((proj: { id: string }) => {
    window.localStorage.setItem('projects', JSON.stringify({ [proj.id]: proj }));
    window.localStorage.setItem('currentProjectId', JSON.stringify(proj.id));
  }, project);
}

test.describe('SVG キャンバス', () => {
  test('仕込んだプロジェクトのキーが描画され、コンソールエラーが出ない', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await seedProject(page);
    await page.goto('/');

    await expect(page.getByTestId('canvas-svg')).toBeVisible();
    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length);
    await expect(page.getByTestId('canvas-grid')).toBeVisible();
    await expect(page.getByTestId('canvas-origin')).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('ホイールでカーソル位置を固定点にズームできる (倍率表示が変わる)', async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(page.locator('[data-testid^="key-"]').first()).toBeVisible();
    await expect(page.getByTestId('zoom-display')).toHaveText('100%');

    const canvas = page.getByTestId('canvas-area');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas-area の boundingBox が取得できませんでした');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -300);

    await expect(page.getByTestId('zoom-display')).not.toHaveText('100%');
  });

  test('ライト / ダークどちらでも描画が壊れない', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await seedProject(page);
      await page.goto('/');
      await expect(page.locator('[data-testid^="key-"]').first()).toBeVisible();
      await expect(page.getByTestId('canvas-svg')).toBeVisible();
    }
  });

  test('リロードしてもプロジェクトが復元される (自動保存の往復)', async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length);

    // 自動保存 (appStorage のデバウンス 1000ms) を待ってからリロードする。
    // 2 回目以降は IndexedDB に保存された内容が使われる (localStorage の
    // 種は addInitScript のたびに再度仕込まれるが、内容は同じプロジェクトなので
    // 結果は変わらない)。
    await page.waitForTimeout(1500);
    await page.reload();

    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length);
  });
});
