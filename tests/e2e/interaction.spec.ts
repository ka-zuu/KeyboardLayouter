import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * docs/UI_SPEC.md#ツール / #キャンバス (操作表) / #キーボードショートカット の
 * うち、M2-3 で実装した範囲 (ツール切替・選択・矩形選択・ドラッグ移動・Alt 複製・
 * 回転ハンドル・主要ショートカット) を検証する。ダブルクリック刻印編集は対象外
 * (未実装、docs/MIGRATION 相当なし)。
 *
 * `tests/e2e/canvas.spec.ts` と同じ `seedProject` パターンを使う。
 */
const fixturePath = fileURLToPath(new URL('../fixtures/layouts/4x4-macropad.json', import.meta.url));
const project = JSON.parse(readFileSync(fixturePath, 'utf-8')) as {
  id: string;
  keys: { id: string; position: { x: number; y: number }; size: { w: number; h: number } }[];
};

const PX_PER_U = 60; // scale=100% のときの 1U あたりの画面 px (core/geometry/units.ts と同じ)。

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript((proj: { id: string }) => {
    window.localStorage.setItem('projects', JSON.stringify({ [proj.id]: proj }));
    window.localStorage.setItem('currentProjectId', JSON.stringify(proj.id));
  }, project);
}

function keyById(id: string): { position: { x: number; y: number }; size: { w: number; h: number } } {
  const key = project.keys.find((k) => k.id === id);
  if (!key) throw new Error(`fixture に ${id} が見つかりません`);
  return key;
}

/** scale=100% / panPx=(0,0) 前提で、キー中心のページ座標を返す (canvas-area の boundingBox 基準)。 */
function keyCenterPagePos(canvasBox: { x: number; y: number }, id: string): { x: number; y: number } {
  const key = keyById(id);
  return {
    x: canvasBox.x + (key.position.x + key.size.w / 2) * PX_PER_U,
    y: canvasBox.y + (key.position.y + key.size.h / 2) * PX_PER_U,
  };
}

async function getCanvasBox(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await page.getByTestId('canvas-area').boundingBox();
  if (!box) throw new Error('canvas-area の boundingBox が取得できませんでした');
  return box;
}

async function transformOf(locator: Locator): Promise<string> {
  return (await locator.getAttribute('transform')) ?? '';
}

test.describe('ツール切替・選択・ドラッグ編集・回転ハンドル', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length);
    // ページ本体にフォーカスを移し、単独キーのショートカットが効く状態にする。
    await page.locator('body').click({ position: { x: 5, y: 5 } });
  });

  test('V/K/R/H でツールボタンの aria-pressed が切り替わる', async ({ page }) => {
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('k');
    await expect(page.getByTestId('tool-addKey')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'false');

    await page.keyboard.press('r');
    await expect(page.getByTestId('tool-rotate')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('h');
    await expect(page.getByTestId('tool-pan')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('v');
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');
  });

  test('クリックで単一選択、空白クリックで選択解除', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');

    await page.mouse.click(pos.x, pos.y);
    await expect(page.getByTestId('selection-count')).toHaveText('選択 1 個');

    // 何もキーが無い空白領域 (右下寄り)。
    await page.mouse.click(canvasBox.x + canvasBox.width - 20, canvasBox.y + canvasBox.height - 20);
    await expect(page.getByTestId('selection-count')).toHaveText('選択なし');
  });

  test('Shift+クリックで追加選択・除外できる', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const posA = keyCenterPagePos(canvasBox, 'r0c0');
    const posB = keyCenterPagePos(canvasBox, 'r0c1');

    await page.mouse.click(posA.x, posA.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(posB.x, posB.y);
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('selection-count')).toHaveText('選択 2 個');

    await page.keyboard.down('Shift');
    await page.mouse.click(posA.x, posA.y);
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('selection-count')).toHaveText('選択 1 個');
  });

  test('矩形選択でドラッグ範囲内のキーが選択される', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    // このフィクスチャは x:0..4, y:0..4 がすき間なく埋まっているため、矩形選択の
    // 開始点 (pointerdown) は空白かつキャンバス要素内 (正の座標) である必要がある。
    // グリッドの外側 (y=5、全キーの下) から始め、r3c0 (0,3,2x1) と r3c2 (2,3,1x1)
    // だけを覆う範囲までドラッグする (r2c3 は x:3..4 なので含めない)。
    const start = { x: canvasBox.x + 0.5 * PX_PER_U, y: canvasBox.y + 5 * PX_PER_U };
    const end = { x: canvasBox.x + 2.9 * PX_PER_U, y: canvasBox.y + 3.1 * PX_PER_U };

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move((start.x + end.x) / 2, (start.y + end.y) / 2);
    await page.mouse.move(end.x, end.y);
    await page.mouse.up();

    await expect(page.getByTestId('selection-count')).toHaveText('選択 2 個');
  });

  test('キーをドラッグすると位置 (transform) が変わる', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    const locator = page.getByTestId('key-r0c0');
    const before = await transformOf(locator);

    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    await page.mouse.move(pos.x + 3 * PX_PER_U, pos.y + 2 * PX_PER_U, { steps: 5 });
    await page.mouse.up();

    const after = await transformOf(locator);
    expect(after).not.toBe(before);
  });

  test('Alt+ドラッグで複製できる (キー総数が増える)', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');

    await page.keyboard.down('Alt');
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    await page.mouse.move(pos.x + 2 * PX_PER_U, pos.y + 2 * PX_PER_U, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Alt');

    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length + 1);
  });

  test('回転ハンドルをドラッグすると選択キーが回転する', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    // r2c0 (0,2,1x1) と r2c1 (1,2,1x1)。AABB 中心 (1,2)、ハンドルは (1, 1.5)。
    const posA = keyCenterPagePos(canvasBox, 'r2c0');
    const posB = keyCenterPagePos(canvasBox, 'r2c1');
    await page.mouse.click(posA.x, posA.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(posB.x, posB.y);
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('selection-count')).toHaveText('選択 2 個');

    const handleBox = await page.getByTestId('rotate-handle').boundingBox();
    if (!handleBox) throw new Error('rotate-handle の boundingBox が取得できませんでした');
    const handleCenter = { x: handleBox.x + handleBox.width / 2, y: handleBox.y + handleBox.height / 2 };
    const pivot = { x: canvasBox.x + 1 * PX_PER_U, y: canvasBox.y + 2 * PX_PER_U };
    const radius = Math.hypot(handleCenter.x - pivot.x, handleCenter.y - pivot.y);

    await page.mouse.move(handleCenter.x, handleCenter.y);
    await page.mouse.down();
    // ピボットの真右へ動かす (90° 相当)。
    await page.mouse.move(pivot.x + radius, pivot.y, { steps: 8 });
    await page.mouse.up();

    const transform = await transformOf(page.getByTestId('key-r2c0'));
    expect(transform).toContain('rotate(');
  });

  test('Esc で選択解除される', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    await page.mouse.click(pos.x, pos.y);
    await expect(page.getByTestId('selection-count')).toHaveText('選択 1 個');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('selection-count')).toHaveText('選択なし');
  });

  test('Delete で選択中のキーが削除される', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    await page.mouse.click(pos.x, pos.y);

    await page.keyboard.press('Delete');

    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length - 1);
    await expect(page.getByTestId('key-r0c0')).toHaveCount(0);
    await expect(page.getByTestId('selection-count')).toHaveText('選択なし');
  });

  test('Cmd/Ctrl+Z で削除が取り消される', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    await page.mouse.click(pos.x, pos.y);
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length - 1);

    await page.keyboard.press('Control+z');

    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length);
    await expect(page.getByTestId('key-r0c0')).toHaveCount(1);
  });

  test('矢印キーで選択中のキーがグリッド幅だけ移動する', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    const locator = page.getByTestId('key-r0c0');
    await page.mouse.click(pos.x, pos.y);
    const before = await transformOf(locator);

    await page.keyboard.press('ArrowRight');

    const after = await transformOf(locator);
    expect(after).not.toBe(before);
  });

  test('Cmd/Ctrl+A で全選択できる', async ({ page }) => {
    await page.keyboard.press('Control+a');
    await expect(page.getByTestId('selection-count')).toHaveText(`選択 ${project.keys.length.toString()} 個`);
  });

  test('コンソールエラーが出ない', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    await page.mouse.click(pos.x, pos.y);
    await page.keyboard.press('r');
    await page.keyboard.press('Escape');
    await page.keyboard.press('v');

    expect(consoleErrors).toEqual([]);
  });
});
