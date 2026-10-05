import { expect, test, type Page } from '@playwright/test';

/**
 * docs/UI_SPEC.md#左パネル (キー追加プリセット / プロジェクト一覧) を検証する。
 * 空の状態 (新規プロジェクト、scale=100%、pan=(0,0)) から始める。
 */
const PX_PER_U = 60; // scale=100% のときの 1U あたりの画面 px (core/geometry/units.ts と同じ)。
const KEYS = '[data-testid^="key-"]';

async function canvasBox(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await page.getByTestId('canvas-area').boundingBox();
  if (!box) throw new Error('canvas-area の boundingBox が取得できませんでした');
  return box;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('project-list').locator('li')).toHaveCount(1);
});

test.describe('キー追加プリセット', () => {
  test('クリックでキャンバス中央に追加され、追加したキーが選択される', async ({ page }) => {
    await page.getByTestId('preset-1u').click();

    await expect(page.locator(KEYS)).toHaveCount(1);
    await expect(page.getByTestId('selection-count')).toHaveText('選択 1 個');

    const box = await canvasBox(page);
    const key = await page.locator(KEYS).first().boundingBox();
    expect(key).not.toBeNull();
    // グリッド (0.25U) スナップ分のずれを許容して、キー中心がキャンバス中央付近にあること。
    expect(Math.abs(key!.x + key!.width / 2 - (box.x + box.width / 2))).toBeLessThanOrEqual(0.25 * PX_PER_U);
    expect(Math.abs(key!.y + key!.height / 2 - (box.y + box.height / 2))).toBeLessThanOrEqual(0.25 * PX_PER_U);
  });

  test('個数 4 で 4 個が X 方向に隣接して追加される', async ({ page }) => {
    await page.getByTestId('preset-count').fill('4');
    await page.getByTestId('preset-1.5u').click();

    await expect(page.locator(KEYS)).toHaveCount(4);
    await expect(page.getByTestId('selection-count')).toHaveText('選択 4 個');

    const boxes = await page.locator(KEYS).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y })));
    const xs = boxes.map((b) => b.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeCloseTo(1.5 * PX_PER_U, 0);
    expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
  });

  test('既存キーと重なる位置にはグリッド幅ずつ右へずらして追加される', async ({ page }) => {
    await page.getByTestId('preset-1u').click();
    await page.getByTestId('preset-1u').click();

    await expect(page.locator(KEYS)).toHaveCount(2);
    const xs = await page.locator(KEYS).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
    expect(Math.abs(xs[1]! - xs[0]!)).toBeGreaterThanOrEqual(PX_PER_U - 1);
  });

  test('ドラッグ＆ドロップで落とした位置に追加される', async ({ page }) => {
    await page.getByTestId('preset-1u').dragTo(page.getByTestId('canvas-area'), { targetPosition: { x: 2 * PX_PER_U, y: 3 * PX_PER_U } });

    await expect(page.locator(KEYS)).toHaveCount(1);
    // ドロップ位置 (2U, 3U) がキー中心になるので左上は (1.5U, 2.5U)。
    await expect(page.getByTestId('position-x')).toHaveValue('1.5');
    await expect(page.getByTestId('position-y')).toHaveValue('2.5');
  });

  test('ISO Enter プリセットは形状 isoEnter のキーを追加する', async ({ page }) => {
    await page.getByTestId('preset-iso-enter').click();
    await expect(page.getByTestId('shape-select')).toHaveValue('isoEnter');
  });
});

test.describe('プロジェクト一覧', () => {
  test('新規作成 → 切替 → 削除', async ({ page }) => {
    const list = page.getByTestId('project-list').locator('li');

    // 1 つ目にキーを 1 個置いてから、新規プロジェクトを作る。
    await page.getByTestId('preset-1u').click();
    await page.getByTestId('project-menu-button').click();
    await page.getByTestId('project-menu-new').click();

    await expect(list).toHaveCount(2);
    await expect(page.locator(KEYS)).toHaveCount(0);
    // 現在のプロジェクトが先頭。
    await expect(list.first()).toHaveAttribute('aria-current', 'true');
    await expect(list.nth(1)).toContainText('1 キー');

    // 2 つ目 (キー 1 個の方) に切り替える。
    await list.nth(1).locator('.kl-project-open').click();
    await expect(page.locator(KEYS)).toHaveCount(1);
    await expect(list.first()).toContainText('1 キー');

    // 現在のプロジェクトを削除すると、残りの方へ切り替わる。
    await list
      .first()
      .getByRole('button', { name: /を削除/ })
      .click();
    await expect(page.getByTestId('confirm-dialog')).toContainText('削除しますか');
    await page.getByTestId('confirm-ok').click();
    await expect(list).toHaveCount(1);
    await expect(page.locator(KEYS)).toHaveCount(0);
  });

  test('複製すると同じキーを持つ「のコピー」が現在のプロジェクトになる', async ({ page }) => {
    await page.getByTestId('preset-count').fill('3');
    await page.getByTestId('preset-1u').click();
    await page.getByTestId('project-menu-button').click();
    await page.getByTestId('project-menu-duplicate').click();

    await expect(page.getByTestId('project-list').locator('li')).toHaveCount(2);
    await expect(page.getByTestId('toolbar-project-name')).toHaveText('Untitled のコピー');
    await expect(page.locator(KEYS)).toHaveCount(3);
  });

  test('作成したプロジェクトはリロード後も一覧に残る', async ({ page }) => {
    await page.getByTestId('preset-1u').click();
    await page.getByTestId('project-menu-button').click();
    await page.getByTestId('project-menu-new').click();
    // 自動保存 (appStorage のデバウンス 1000ms) を待ってからリロードする (canvas.spec.ts と同じ)。
    // save-status は editorPrefs の書き込みでも「保存済み」になるため、待ち合わせには使えない。
    await page.waitForTimeout(1500);

    await page.reload();
    await expect(page.getByTestId('project-list').locator('li')).toHaveCount(2);
  });
});
