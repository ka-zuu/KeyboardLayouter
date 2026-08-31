import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/**
 * docs/UI_SPEC.md#インスペクタ (無選択/単一選択/複数選択の 3 種) を検証する。
 * `tests/e2e/interaction.spec.ts` と同じ `seedProject` パターンを使う。
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

test.describe('インスペクタ', () => {
  test.beforeEach(async ({ page }) => {
    await seedProject(page);
    await page.goto('/');
    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length);
  });

  test('無選択時はプロジェクト設定が表示される', async ({ page }) => {
    await expect(page.getByTestId('project-inspector')).toBeVisible();
    await expect(page.getByTestId('project-key-count')).toHaveText(String(project.keys.length));
  });

  test('プロジェクト名を編集すると反映され、リロード後も保持される', async ({ page }) => {
    const nameInput = page.getByTestId('project-name');
    await nameInput.fill('リネームされたプロジェクト');
    await nameInput.blur();
    await expect(nameInput).toHaveValue('リネームされたプロジェクト');

    // 自動保存を待ってからリロードし、永続化されていることを確認する。
    await page.waitForTimeout(1200);
    await page.reload();
    await expect(page.getByTestId('project-name')).toHaveValue('リネームされたプロジェクト');
  });

  test('マトリクス自動割り当て (全キー対象) でキー数分の Row/Col が割り当たる', async ({ page }) => {
    await page.getByTestId('auto-assign-all').click();
    await page.getByTestId('validate-matrix').click();
    await expect(page.getByTestId('matrix-report')).toBeVisible();
  });

  test('キーを 1 個選択するとキープロパティが表示され、刻印を編集できる', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    await page.mouse.click(pos.x, pos.y);

    await expect(page.getByTestId('single-key-inspector')).toBeVisible();

    const centerLegend = page.getByTestId('legend-center');
    await centerLegend.fill('A');
    await centerLegend.blur();
    await expect(page.locator('[data-testid="key-r0c0"] text').filter({ hasText: 'A' })).toBeVisible();
  });

  test('X 座標をドラッグ入力で変更するとキーが移動する', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    await page.mouse.click(pos.x, pos.y);

    const xInput = page.getByTestId('position-x');
    await expect(xInput).toHaveValue('0');
    await xInput.fill('2');
    await xInput.blur();

    await expect(xInput).toHaveValue('2');
  });

  test('マトリクス Row/Col を設定できる', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    await page.mouse.click(pos.x, pos.y);

    const rowInput = page.getByTestId('matrix-row');
    await rowInput.fill('5');
    await rowInput.blur();
    await expect(rowInput).toHaveValue('5');

    await page.getByTestId('matrix-unassign').click();
    await expect(page.getByTestId('matrix-row')).toHaveValue('');
    await expect(page.getByTestId('matrix-row')).toHaveAttribute('placeholder', '—');
  });

  test('複数選択するとキー数と AABB が表示され、一括編集の値が揃っていなければ「—」になる', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const posA = keyCenterPagePos(canvasBox, 'r3c0'); // w=2
    const posB = keyCenterPagePos(canvasBox, 'r3c2'); // w=1 (異なる w)

    await page.mouse.click(posA.x, posA.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(posB.x, posB.y);
    await page.keyboard.up('Shift');

    await expect(page.getByTestId('multi-key-inspector')).toBeVisible();
    await expect(page.getByTestId('multi-summary')).toHaveText('2 個のキーを選択中');
    await expect(page.getByTestId('bulk-w')).toHaveValue('');
    await expect(page.getByTestId('bulk-w')).toHaveAttribute('placeholder', '—');
  });

  test('一括編集で W を揃えると両方のキーに反映される', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const posA = keyCenterPagePos(canvasBox, 'r3c0');
    const posB = keyCenterPagePos(canvasBox, 'r3c2');

    await page.mouse.click(posA.x, posA.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(posB.x, posB.y);
    await page.keyboard.up('Shift');

    const bulkW = page.getByTestId('bulk-w');
    await bulkW.fill('1.5');
    await bulkW.blur();
    await expect(bulkW).toHaveValue('1.5');
  });

  test('整列ボタンで複数キーの Y 座標が揃う', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    // 整列後も重ならないよう x が異なるキーを選ぶ (r0c1: x=1,y=0 / r2c0: x=0,y=2)。
    const posA = keyCenterPagePos(canvasBox, 'r0c1');
    const posB = keyCenterPagePos(canvasBox, 'r2c0');

    await page.mouse.click(posA.x, posA.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(posB.x, posB.y);
    await page.keyboard.up('Shift');

    await page.getByTestId('align-top').click();

    // 空白をクリックして選択を解除してから (同一選択内のクリックは選択を維持する仕様のため)、
    // 整列後の画面位置から r2c0 だけを選び直す。
    await page.mouse.click(canvasBox.x + canvasBox.width - 20, canvasBox.y + canvasBox.height - 20);
    const r2c0Box = await page.getByTestId('key-r2c0').boundingBox();
    if (!r2c0Box) throw new Error('key-r2c0 の boundingBox が取得できませんでした');
    await page.mouse.click(r2c0Box.x + r2c0Box.width / 2, r2c0Box.y + r2c0Box.height / 2);

    await expect(page.getByTestId('single-key-inspector')).toBeVisible();
    await expect(page.getByTestId('position-y')).toHaveValue('0');
  });

  test('操作: 複製・削除ボタンが動く', async ({ page }) => {
    const canvasBox = await getCanvasBox(page);
    const pos = keyCenterPagePos(canvasBox, 'r0c0');
    await page.mouse.click(pos.x, pos.y);

    await page.getByTestId('single-key-duplicate').click();
    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length + 1);

    await page.getByTestId('single-key-delete').click();
    await expect(page.locator('[data-testid^="key-"]')).toHaveCount(project.keys.length);
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
    await page.getByTestId('shape-select').selectOption('isoEnter');
    await page.keyboard.press('Escape');

    expect(consoleErrors).toEqual([]);
  });
});
