import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/**
 * M2-8: docs/TESTING.md#e2e-テスト の不足シナリオ (履歴・複数選択ドラッグ・テーマ・
 * 設定の永続化・ショートカット・ステータスバー) を埋める。
 * `interaction.spec.ts` と同じ `seedProject` パターンを使う。
 */
const fixturePath = fileURLToPath(new URL('../fixtures/layouts/4x4-macropad.json', import.meta.url));
const project = JSON.parse(readFileSync(fixturePath, 'utf-8')) as {
  id: string;
  keys: { id: string; position: { x: number; y: number }; size: { w: number; h: number } }[];
};

const PX_PER_U = 60;

async function seedProject(page: Page): Promise<void> {
  await page.addInitScript((proj: { id: string }) => {
    // リロードしても毎回同じ初期状態にする (editorPrefs など他のキーは触らない)。
    window.localStorage.setItem('projects', JSON.stringify({ [proj.id]: proj }));
    window.localStorage.setItem('currentProjectId', JSON.stringify(proj.id));
  }, project);
}

function centerOf(canvasBox: { x: number; y: number }, id: string): { x: number; y: number } {
  const key = project.keys.find((k) => k.id === id);
  if (!key) throw new Error(`fixture に ${id} が見つかりません`);
  return {
    x: canvasBox.x + (key.position.x + key.size.w / 2) * PX_PER_U,
    y: canvasBox.y + (key.position.y + key.size.h / 2) * PX_PER_U,
  };
}

async function canvasBoxOf(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('canvas-area').boundingBox();
  if (!box) throw new Error('canvas-area の boundingBox が取得できませんでした');
  return box;
}

async function pageCenterOf(page: Page, id: string): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId(`key-${id}`).boundingBox();
  if (!box) throw new Error(`key-${id} の boundingBox が取得できませんでした`);
  return { x: box.x, y: box.y };
}

async function dragFromTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
}

const keyCount = (page: Page) => page.locator('[data-testid^="key-"]');

test.describe('M2 完了検証', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(keyCount(page)).toHaveCount(project.keys.length);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
  });

  test('ステータスバーに選択範囲の座標が出る', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const pos = centerOf(box, 'r1c1');
    await page.mouse.click(pos.x, pos.y);
    await expect(page.getByTestId('selection-position')).toHaveText('x 1.00 y 1.00');
  });

  test('ドラッグ 1 回が履歴 1 段で、Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z で戻せる', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const start = centerOf(box, 'r0c0');
    // 選択中は枠線の分だけ boundingBox が変わるので、先に選択してから測る。
    await page.mouse.click(start.x, start.y);
    const before = await pageCenterOf(page, 'r0c0');

    await dragFromTo(page, start, { x: start.x + 3 * PX_PER_U, y: start.y + 2 * PX_PER_U });
    const moved = await pageCenterOf(page, 'r0c0');
    expect(moved.x).toBeGreaterThan(before.x + PX_PER_U);

    await page.keyboard.press('Control+z');
    expect(await pageCenterOf(page, 'r0c0')).toEqual(before);

    await page.keyboard.press('Control+y');
    expect(await pageCenterOf(page, 'r0c0')).toEqual(moved);

    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+Shift+z');
    expect(await pageCenterOf(page, 'r0c0')).toEqual(moved);
  });

  test('3 個選択してドラッグすると相対位置が保たれる', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const ids = ['r0c0', 'r0c1', 'r1c0'];
    await page.mouse.click(centerOf(box, ids[0]!).x, centerOf(box, ids[0]!).y);
    await page.keyboard.down('Shift');
    for (const id of ids.slice(1)) await page.mouse.click(centerOf(box, id).x, centerOf(box, id).y);
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('selection-count')).toHaveText('選択 3 個');

    const before = await Promise.all(ids.map((id) => pageCenterOf(page, id)));
    const start = centerOf(box, 'r0c1');
    await dragFromTo(page, start, { x: start.x + 2 * PX_PER_U, y: start.y + 3 * PX_PER_U });
    const after = await Promise.all(ids.map((id) => pageCenterOf(page, id)));

    const dx = after[0]!.x - before[0]!.x;
    const dy = after[0]!.y - before[0]!.y;
    expect(dx).toBeGreaterThan(PX_PER_U);
    for (let i = 1; i < ids.length; i++) {
      expect(after[i]!.x - before[i]!.x).toBeCloseTo(dx, 1);
      expect(after[i]!.y - before[i]!.y).toBeCloseTo(dy, 1);
    }
  });

  test('テーマ切替ボタンで data-theme が循環する', async ({ page }) => {
    const html = page.locator('html');
    const toggle = page.getByTestId('theme-toggle');
    const seen = new Set<string | null>();
    for (let i = 0; i < 3; i++) {
      seen.add(await html.getAttribute('data-theme'));
      await toggle.click();
    }
    // システム (属性なし) / ライト / ダーク の 3 状態を巡る。
    expect(seen.size).toBe(3);
    expect(seen.has(null)).toBe(true);
    // 切り替えても画面が壊れない。
    await expect(keyCount(page)).toHaveCount(project.keys.length);
  });

  test('グリッド刻みとスナップの設定はリロード後も残る', async ({ page }) => {
    await page.getByTestId('grid-size-select').selectOption('0.5');
    await page.getByTestId('snap-toggle').click();
    await expect(page.getByTestId('snap-toggle')).toHaveAttribute('aria-pressed', 'false');
    // 自動保存のデバウンス (1000ms) を待ってからリロードする。
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(keyCount(page)).toHaveCount(project.keys.length);
    await expect(page.getByTestId('grid-size-select')).toHaveValue('0.5');
    await expect(page.getByTestId('snap-toggle')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Ctrl+C / Ctrl+V でコピー、Ctrl+D で複製、Backspace で削除', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const pos = centerOf(box, 'r0c0');
    await page.mouse.click(pos.x, pos.y);

    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await expect(keyCount(page)).toHaveCount(project.keys.length + 1);

    await page.keyboard.press('Control+d');
    await expect(keyCount(page)).toHaveCount(project.keys.length + 2);

    await page.keyboard.press('Backspace');
    await expect(keyCount(page)).toHaveCount(project.keys.length + 1);
  });

  test('Shift+矢印で 1U 動き、矢印だけならグリッド刻みで動く', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const pos = centerOf(box, 'r0c0');
    await page.mouse.click(pos.x, pos.y);
    const before = await pageCenterOf(page, 'r0c0');

    await page.keyboard.press('Shift+ArrowRight');
    const afterShift = await pageCenterOf(page, 'r0c0');
    expect(afterShift.x - before.x).toBeCloseTo(PX_PER_U, 0);

    await page.keyboard.press('ArrowRight');
    const afterPlain = await pageCenterOf(page, 'r0c0');
    expect(afterPlain.x - afterShift.x).toBeGreaterThan(0);
    expect(afterPlain.x - afterShift.x).toBeLessThan(PX_PER_U);
  });

  test('Tab / Shift+Tab で選択が巡回する', async ({ page }) => {
    const box = await canvasBoxOf(page);
    const pos = centerOf(box, 'r0c0');
    await page.mouse.click(pos.x, pos.y);

    const selected = page.locator('[data-testid^="key-"].kl-key--selected');
    await expect(selected).toHaveCount(1);
    const first = await selected.getAttribute('data-testid');
    await page.keyboard.press('Tab');
    const second = await selected.getAttribute('data-testid');
    expect(second).not.toBe(first);
    await page.keyboard.press('Shift+Tab');
    expect(await selected.getAttribute('data-testid')).toBe(first);
  });
});
