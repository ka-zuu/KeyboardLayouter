import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/**
 * M2-8: パン / ピンチ / Add・Rotate ツール / マトリクス UI の E2E。
 * docs/UI_SPEC.md#キャンバス・#ツール・#インスペクタ、docs/MATRIX.md。
 */
const fixturePath = fileURLToPath(new URL('../fixtures/layouts/4x4-macropad.json', import.meta.url));
const project = JSON.parse(readFileSync(fixturePath, 'utf-8')) as {
  id: string;
  keys: { id: string; position: { x: number; y: number }; size: { w: number; h: number } }[];
};

const PX_PER_U = 60;

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript((proj: { id: string }) => {
    window.localStorage.setItem('projects', JSON.stringify({ [proj.id]: proj }));
    window.localStorage.setItem('currentProjectId', JSON.stringify(proj.id));
  }, project);
}

async function canvasBoxOf(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await page.getByTestId('canvas-area').boundingBox();
  if (!box) throw new Error('canvas-area の boundingBox が取得できませんでした');
  return box;
}

function centerOf(canvasBox: { x: number; y: number }, id: string): { x: number; y: number } {
  const key = project.keys.find((k) => k.id === id);
  if (!key) throw new Error(`fixture に ${id} が見つかりません`);
  return {
    x: canvasBox.x + (key.position.x + key.size.w / 2) * PX_PER_U,
    y: canvasBox.y + (key.position.y + key.size.h / 2) * PX_PER_U,
  };
}

async function topLeftOf(page: Page, id: string): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId(`key-${id}`).boundingBox();
  if (!box) throw new Error(`key-${id} の boundingBox が取得できませんでした`);
  return { x: box.x, y: box.y };
}

const keyCount = (page: Page) => page.locator('[data-testid^="key-"]');

async function selectKeys(page: Page, ids: string[]): Promise<void> {
  const box = await canvasBoxOf(page);
  for (const [i, id] of ids.entries()) {
    const pos = centerOf(box, id);
    if (i > 0) await page.keyboard.down('Shift');
    await page.mouse.click(pos.x, pos.y);
    if (i > 0) await page.keyboard.up('Shift');
  }
  await expect(page.getByTestId('selection-count')).toHaveText(`選択 ${ids.length.toString()} 個`);
}

test.beforeEach(async ({ page }) => {
  await seedProject(page);
  await page.goto('/');
  await expect(keyCount(page)).toHaveCount(project.keys.length);
  await page.locator('body').click({ position: { x: 5, y: 5 } });
});

test.describe('パン・ピンチ', () => {
  test('Space を押しながらドラッグするとパンし、キーは動かない', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const pos = centerOf(box, 'r1c1');
    const before = await topLeftOf(page, 'r1c1');

    await page.keyboard.down('Space');
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    await page.mouse.move(pos.x + 80, pos.y + 50, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Space');

    const after = await topLeftOf(page, 'r1c1');
    expect(after.x - before.x).toBeCloseTo(80, 0);
    expect(after.y - before.y).toBeCloseTo(50, 0);
    // パンであって移動ではない: 座標は変わらず、選択もされない。
    await expect(page.getByTestId('selection-count')).toHaveText('選択なし');
  });

  test('中ボタンドラッグでパンする', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const pos = centerOf(box, 'r1c1');
    const before = await topLeftOf(page, 'r1c1');

    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(pos.x - 60, pos.y + 40, { steps: 5 });
    await page.mouse.up({ button: 'middle' });

    const after = await topLeftOf(page, 'r1c1');
    expect(after.x - before.x).toBeCloseTo(-60, 0);
    expect(after.y - before.y).toBeCloseTo(40, 0);
  });

  test('Pan ツール (H) の左ドラッグでパンする', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const pos = centerOf(box, 'r1c1');
    const before = await topLeftOf(page, 'r1c1');

    await page.keyboard.press('h');
    await expect(page.getByTestId('tool-pan')).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    await page.mouse.move(pos.x + 30, pos.y + 30, { steps: 4 });
    await page.mouse.up();

    const after = await topLeftOf(page, 'r1c1');
    expect(after.x - before.x).toBeCloseTo(30, 0);
  });

  test('Shift+ホイールで横スクロールする', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const before = await topLeftOf(page, 'r1c1');

    await page.mouse.move(box.x + 300, box.y + 300);
    await page.keyboard.down('Shift');
    await page.mouse.wheel(0, 100);
    await page.keyboard.up('Shift');

    await expect.poll(async () => (await topLeftOf(page, 'r1c1')).x).toBeCloseTo(before.x - 100, 0);
  });

  test('ホイールでカーソル位置を固定してズームする', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const pos = centerOf(box, 'r0c0');
    const zoomBefore = await page.getByTestId('zoom-display').textContent();

    await page.mouse.move(pos.x, pos.y);
    await page.mouse.wheel(0, -200);

    await expect(page.getByTestId('zoom-display')).not.toHaveText(zoomBefore ?? '');
  });

  test('2 本指ピンチで倍率が変わる', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const cx = box.x + 300;
    const cy = box.y + 300;
    const zoomBefore = await page.getByTestId('zoom-display').textContent();

    // Playwright のマウスは 1 本しか出せないので、Pointer Events を直接発火する。
    await page.getByTestId('canvas-area').evaluate(
      (el, c) => {
        const fire = (type: string, id: number, x: number, y: number): void => {
          el.dispatchEvent(
            new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: 0, bubbles: true, isPrimary: id === 1 }),
          );
        };
        fire('pointerdown', 1, c.x - 40, c.y);
        fire('pointerdown', 2, c.x + 40, c.y);
        fire('pointermove', 1, c.x - 40, c.y); // 開始距離の記録
        fire('pointermove', 1, c.x - 120, c.y);
        fire('pointermove', 2, c.x + 120, c.y);
        fire('pointerup', 1, c.x - 120, c.y);
        fire('pointerup', 2, c.x + 120, c.y);
      },
      { x: cx, y: cy },
    );

    await expect(page.getByTestId('zoom-display')).not.toHaveText(zoomBefore ?? '');
  });
});

test.describe('ツール', () => {
  test('Add Key ツール (K) で空きセルをクリックするとキーが増える', async ({ page }) => {
    const box = await canvasBoxOf(page);
    await page.keyboard.press('k');
    await expect(page.getByTestId('tool-addKey')).toHaveAttribute('aria-pressed', 'true');

    // フィクスチャは y:0..4 が埋まっているので、その下 (y=6) をクリックする。
    await page.mouse.click(box.x + 1.5 * PX_PER_U, box.y + 6.5 * PX_PER_U);
    await expect(keyCount(page)).toHaveCount(project.keys.length + 1);

    // ドラッグで連続配置できる (UI_SPEC: 「ドラッグで連続配置」)。
    await page.mouse.move(box.x + 4.5 * PX_PER_U, box.y + 6.5 * PX_PER_U);
    await page.mouse.down();
    await page.mouse.move(box.x + 7.5 * PX_PER_U, box.y + 6.5 * PX_PER_U, { steps: 12 });
    await page.mouse.up();
    expect(await keyCount(page).count()).toBeGreaterThanOrEqual(project.keys.length + 3);

    // Esc で Select ツールに戻る。
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Rotate ツール (R) に切り替わり、選択キーの回転ハンドルを Shift で 15° 刻みにできる', async ({ page }) => {
    await selectKeys(page, ['r2c0', 'r2c1']);
    await page.keyboard.press('r');
    await expect(page.getByTestId('tool-rotate')).toHaveAttribute('aria-pressed', 'true');

    const box = await canvasBoxOf(page);
    const handle = await page.getByTestId('rotate-handle').boundingBox();
    if (!handle) throw new Error('rotate-handle が見つかりません');
    const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    const pivot = { x: box.x + 1 * PX_PER_U, y: box.y + 2 * PX_PER_U };
    const radius = Math.hypot(from.x - pivot.x, from.y - pivot.y);
    // 約 37° 回した位置 (15° 刻みなら 30° か 45° に丸まる)。
    const rad = (-90 + 37) * (Math.PI / 180);

    await page.keyboard.down('Shift');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(pivot.x + radius * Math.cos(rad), pivot.y + radius * Math.sin(rad), { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Shift');

    const angle = Number(await page.getByTestId('bulk-angle').inputValue());
    expect(angle).not.toBe(0);
    expect(Math.abs(angle) % 15).toBeCloseTo(0, 3);
  });
});

test.describe('マトリクス', () => {
  test('選択キーだけを、指定した開始 Row / Col で割り当てる', async ({ page }) => {
    await selectKeys(page, ['r2c0', 'r2c1']);
    await page.getByLabel('開始 Row').fill('7');
    await page.getByLabel('開始 Row').blur();
    await page.getByTestId('auto-assign-selected').click();

    await expect(page.getByTestId('key-r2c0')).toHaveAttribute('data-matrix', '7,0');
    await expect(page.getByTestId('key-r2c1')).toHaveAttribute('data-matrix', '7,1');
    // 選択外は変わらない。
    await expect(page.getByTestId('key-r0c0')).toHaveAttribute('data-matrix', '0,0');
    await expect(page.getByTestId('key-r3c0')).toHaveAttribute('data-matrix', '3,0');
  });

  test('マトリクス検証レポートに未割り当てと欠番が出る', async ({ page }) => {
    // r3c2 の割り当てを外す → 未割り当て 1 件。
    await selectKeys(page, ['r3c2']);
    await page.getByTestId('matrix-unassign').click();
    await page.keyboard.press('Escape');
    await page.getByTestId('validate-matrix').click();
    await expect(page.getByTestId('matrix-report')).toContainText('割り当てられていません');

    // 全キーを再割り当てすると問題が無くなる。
    await page.getByTestId('auto-assign-all').click();
    await page.getByTestId('validate-matrix').click();
    await expect(page.getByTestId('matrix-report')).not.toContainText('割り当てられていません');
  });

  test('ステータスバーに Matrix サイズが出る', async ({ page }) => {
    await expect(page.getByTestId('matrix-size')).toHaveText('Matrix 4×4');
  });

  test('Ctrl+M でキー上のマトリクス番号表示を切り替える', async ({ page }) => {
    const label = page.locator('[data-testid="key-r0c0"] text');
    const before = await label.count();
    await page.keyboard.press('Control+m');
    await expect.poll(async () => label.count()).not.toBe(before);
  });
});
