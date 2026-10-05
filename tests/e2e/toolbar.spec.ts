import { expect, test } from '@playwright/test';

/** docs/UI_SPEC.md#ツールバー のうち、プロジェクト名・メニュー・Undo/Redo・ズームを検証する。 */
const KEYS = '[data-testid^="key-"]';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('toolbar-project-name')).toHaveText('Untitled');
});

test.describe('プロジェクト名', () => {
  test('クリックで編集し Enter で確定、一覧にも反映される', async ({ page }) => {
    await page.getByTestId('toolbar-project-name').click();
    await page.getByTestId('toolbar-project-name-input').fill('My Board');
    await page.getByTestId('toolbar-project-name-input').press('Enter');

    await expect(page.getByTestId('toolbar-project-name')).toHaveText('My Board');
    await expect(page.getByTestId('project-list')).toContainText('My Board');
  });

  test('Esc で取り消す', async ({ page }) => {
    await page.getByTestId('toolbar-project-name').click();
    await page.getByTestId('toolbar-project-name-input').fill('Discarded');
    await page.getByTestId('toolbar-project-name-input').press('Escape');

    await expect(page.getByTestId('toolbar-project-name')).toHaveText('Untitled');
  });

  test('メニューの「名前を変更」から編集できる', async ({ page }) => {
    await page.getByTestId('project-menu-button').click();
    await page.getByTestId('project-menu-rename').click();
    await expect(page.getByTestId('toolbar-project-name-input')).toBeFocused();
  });

  test('メニューは Esc で閉じる', async ({ page }) => {
    await page.getByTestId('project-menu-button').click();
    await expect(page.getByTestId('project-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('project-menu')).toHaveCount(0);
  });
});

test.describe('Undo / Redo', () => {
  test('履歴が無いときは無効、操作後は操作名をツールチップに出す', async ({ page }) => {
    const undo = page.getByTestId('undo-button');
    const redo = page.getByTestId('redo-button');
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();

    await page.getByTestId('preset-1u').click();
    await expect(undo).toBeEnabled();
    await expect(undo).toHaveAttribute('title', /^キーの追加を取り消す/);

    await undo.click();
    await expect(page.locator(KEYS)).toHaveCount(0);
    await expect(undo).toBeDisabled();
    await expect(redo).toBeEnabled();
    await expect(redo).toHaveAttribute('title', /^キーの追加をやり直す/);

    await redo.click();
    await expect(page.locator(KEYS)).toHaveCount(1);
  });
});

test.describe('ズーム', () => {
  test('+ / - で倍率が変わり、右クリックメニューの 100% で戻る', async ({ page }) => {
    const display = page.getByTestId('zoom-display');
    await expect(display).toHaveText('100%');

    await page.getByTestId('zoom-in').click();
    await expect(display).toHaveText('125%');
    await page.getByTestId('zoom-out').click();
    await page.getByTestId('zoom-out').click();
    await expect(display).toHaveText('80%');

    await display.click({ button: 'right' });
    await page.getByTestId('zoom-menu-reset').click();
    await expect(display).toHaveText('100%');
  });

  test('全体表示でキー全体が画面に収まる', async ({ page }) => {
    await page.getByTestId('preset-count').fill('20');
    await page.getByTestId('preset-1u').click();
    await page.getByTestId('zoom-display').click({ button: 'right' });
    await page.getByTestId('zoom-menu-fit-all').click();

    const canvas = await page.getByTestId('canvas-area').boundingBox();
    const keys = await page.locator(KEYS).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right })));
    for (const k of keys) {
      expect(k.left).toBeGreaterThanOrEqual(canvas!.x - 1);
      expect(k.right).toBeLessThanOrEqual(canvas!.x + canvas!.width + 1);
    }
  });
});
