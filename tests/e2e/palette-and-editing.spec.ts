import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/**
 * M2-7 で実装した範囲を検証する。
 * - コマンドパレット (`Ctrl+K`) / ショートカット一覧 (`?`) — docs/UI_SPEC.md#コマンドパレット-cmdctrlk
 * - ダブルクリック・`Enter` での刻印直接編集 — docs/UI_SPEC.md#操作
 * - パネル折りたたみ (`Ctrl+\` / `Ctrl+Alt+\`) — docs/UI_SPEC.md#画面構成
 * - 倍率の直接入力 — docs/UI_SPEC.md#ツールバー
 * - 「重なっています」表示 — docs/UI_SPEC.md#キーの重なり
 *
 * `interaction.spec.ts` と同じ `seedProject` パターンを使う。
 */
const fixturePath = fileURLToPath(new URL('../fixtures/layouts/4x4-macropad.json', import.meta.url));
const project = JSON.parse(readFileSync(fixturePath, 'utf-8')) as {
  id: string;
  keys: { id: string; position: { x: number; y: number }; size: { w: number; h: number } }[];
};

const PX_PER_U = 60; // scale=100% のときの 1U あたりの画面 px (core/geometry/units.ts と同じ)。
const KEYS = '[data-testid^="key-"]';

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript((proj: { id: string }) => {
    window.localStorage.setItem('projects', JSON.stringify({ [proj.id]: proj }));
    window.localStorage.setItem('currentProjectId', JSON.stringify(proj.id));
  }, project);
}

/** scale=100% / panPx=(0,0) 前提で、キー中心のページ座標を返す。 */
async function keyCenter(page: Page, id: string): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('canvas-area').boundingBox();
  const key = project.keys.find((k) => k.id === id);
  if (!box || !key) throw new Error(`${id} の位置が求められません`);
  return { x: box.x + (key.position.x + key.size.w / 2) * PX_PER_U, y: box.y + (key.position.y + key.size.h / 2) * PX_PER_U };
}

test.beforeEach(async ({ page }) => {
  await seedProject(page);
  await page.goto('/');
  await expect(page.locator(KEYS)).toHaveCount(project.keys.length);
  await page.locator('body').click({ position: { x: 5, y: 5 } });
});

test.describe('コマンドパレット', () => {
  test('Ctrl+K で開き、読み (せいれつ) で整列を引ける。Esc で閉じても選択は残る', async ({ page }) => {
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+k');
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();
    await expect(page.getByTestId('command-palette-input')).toBeFocused();

    await page.keyboard.type('せいれつ');
    await expect(page.getByTestId('command-align.left')).toBeVisible();
    await expect(page.getByTestId('command-view.zoomIn')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(palette).toHaveCount(0);
    await expect(page.getByTestId('selection-count')).toHaveText(`選択 ${project.keys.length.toString()} 個`);
  });

  test('Enter で実行し、次に開くと最近使った操作が先頭に出る', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.keyboard.type('add key');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await expect(page.getByTestId('tool-addKey')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('open-command-palette').click();
    await expect(page.locator('.kl-palette-item').first()).toHaveAttribute('data-testid', 'command-tool.addKey');
  });

  test('実行できない操作は無効表示で、Enter しても実行されない', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.keyboard.type('delete');
    const item = page.getByTestId('command-edit.delete');
    await expect(item).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await expect(page.locator(KEYS)).toHaveCount(project.keys.length);
  });

  test('矢印キーで候補を移動できる', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const items = page.locator('.kl-palette-item');
    await expect(items.nth(0)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(items.last()).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('ショートカット一覧', () => {
  test('? で開き、Esc で閉じる', async ({ page }) => {
    await page.keyboard.press('?');
    const dialog = page.getByTestId('shortcut-help');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Ctrl+K');
    await expect(dialog).toContainText('コマンドパレット');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('パレットの項目からも開ける', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.keyboard.type('shortcut');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('shortcut-help')).toBeVisible();
  });
});

test.describe('刻印の直接編集', () => {
  test('ダブルクリックで主刻印を編集し、Enter で確定する (Undo で戻る)', async ({ page }) => {
    const pos = await keyCenter(page, 'r0c0');
    await page.mouse.dblclick(pos.x, pos.y);
    const input = page.getByTestId('canvas-legend-input');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('1');

    await input.fill('Esc');
    await page.keyboard.press('Enter');
    await expect(input).toHaveCount(0);
    await expect(page.getByTestId('key-r0c0').locator('.kl-key-legend')).toHaveText('Esc');
    // 単一選択インスペクタにも反映される (主刻印は値の入っていた topCenter)。
    await expect(page.getByTestId('legend-topCenter')).toHaveValue('Esc');

    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('key-r0c0').locator('.kl-key-legend')).toHaveText('1');
  });

  test('Esc で取り消すと刻印も選択も変わらない', async ({ page }) => {
    const pos = await keyCenter(page, 'r0c0');
    await page.mouse.dblclick(pos.x, pos.y);
    const input = page.getByTestId('canvas-legend-input');
    await input.fill('X');
    await page.keyboard.press('Escape');
    await expect(input).toHaveCount(0);
    await expect(page.getByTestId('key-r0c0').locator('.kl-key-legend')).toHaveText('1');
    await expect(page.getByTestId('selection-count')).toHaveText('選択 1 個');
  });

  test('キーボードだけで Tab で選んで Enter で編集に入れる', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('selection-count')).toHaveText('選択 1 個');
    await page.keyboard.press('Enter');
    const input = page.getByTestId('canvas-legend-input');
    await expect(input).toBeFocused();
    await page.keyboard.type('A');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('key-r0c0').locator('.kl-key-legend')).toHaveText('A');
  });
});

test.describe('パネルの折りたたみ', () => {
  test('Ctrl+\\ で左パネル、Ctrl+Alt+\\ でインスペクタを開閉する', async ({ page }) => {
    await page.keyboard.press('Control+Backslash');
    await expect(page.getByTestId('left-panel')).toHaveCount(0);
    await expect(page.getByTestId('toggle-left-panel')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Control+Backslash');
    await expect(page.getByTestId('left-panel')).toBeVisible();

    await page.keyboard.press('Control+Alt+Backslash');
    await expect(page.getByTestId('inspector')).toHaveCount(0);
    await page.getByTestId('toggle-right-panel').click();
    await expect(page.getByTestId('inspector')).toBeVisible();
  });

  test('折りたたむとキャンバスが広がる', async ({ page }) => {
    const before = (await page.getByTestId('canvas-area').boundingBox())!.width;
    await page.getByTestId('toggle-left-panel').click();
    await expect.poll(async () => (await page.getByTestId('canvas-area').boundingBox())!.width).toBeGreaterThan(before);
  });
});

test.describe('倍率の直接入力', () => {
  test('クリックで入力欄になり、Enter で適用、Esc で取り消す', async ({ page }) => {
    const display = page.getByTestId('zoom-display');
    await display.click();
    const input = page.getByTestId('zoom-input');
    await expect(input).toBeFocused();
    await input.fill('150');
    await page.keyboard.press('Enter');
    await expect(display).toHaveText('150%');

    await display.click();
    await input.fill('30');
    await page.keyboard.press('Escape');
    await expect(display).toHaveText('150%');

    // 範囲外は上限 (400%) に丸める。
    await display.click();
    await input.fill('900%');
    await page.keyboard.press('Enter');
    await expect(display).toHaveText('400%');
  });
});

test.describe('重なっています表示', () => {
  test('隣接しているだけなら出ず、キーを重ねると出る', async ({ page }) => {
    await page.keyboard.press('Control+a');
    await expect(page.getByTestId('overlap-warning')).toHaveCount(0);
    // 全選択のままだと全キーが一緒に動くので、1 個だけ選び直す。
    await page.keyboard.press('Escape');

    const from = await keyCenter(page, 'r0c0');
    await page.mouse.click(from.x, from.y);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + PX_PER_U / 2, from.y, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId('overlap-warning')).toHaveText(/重なっています/);

    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('overlap-warning')).toHaveCount(0);
  });
});
