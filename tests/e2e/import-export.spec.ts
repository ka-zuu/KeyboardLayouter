import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/**
 * docs/UI_SPEC.md#ツールバー の [取込][書出▾]、#エラーとフィードバック (トースト・確認ダイアログ)、
 * `Cmd/Ctrl+S` の明示保存を検証する。空の状態 (新規プロジェクト) から始める。
 */
const KEYS = '[data-testid^="key-"]';
const MKD_BASIC = fileURLToPath(new URL('../fixtures/project/v0/mkd-basic.json', import.meta.url));

function jsonFile(name: string, text: string): { name: string; mimeType: string; buffer: Buffer } {
  return { name, mimeType: 'application/json', buffer: Buffer.from(text) };
}

async function addKeys(page: Page, count: number): Promise<void> {
  await page.getByTestId('preset-count').fill(count.toString());
  await page.getByTestId('preset-1u').click();
  await expect(page.locator(KEYS)).toHaveCount(count);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('project-list').locator('li')).toHaveCount(1);
});

test.describe('取込', () => {
  test('空のプロジェクトへは確認なしで取り込み、名前とキーが置き換わる', async ({ page }) => {
    await page.getByTestId('import-file-input').setInputFiles(MKD_BASIC);

    await expect(page.getByTestId('toast-success')).toContainText('mkd-basic.json');
    await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
    await expect(page.locator(KEYS)).toHaveCount(2);
    await expect(page.getByTestId('toolbar-project-name')).toHaveText('MKD Basic');
    // 置き換えなので一覧は増えない。
    await expect(page.getByTestId('project-list').locator('li')).toHaveCount(1);
  });

  test('キーがあれば確認ダイアログを出し、置き換え後は Undo で元に戻る', async ({ page }) => {
    await addKeys(page, 3);

    await page.getByTestId('import-file-input').setInputFiles(MKD_BASIC);
    const dialog = page.getByTestId('confirm-dialog');
    await expect(dialog).toContainText('「Untitled」を「MKD Basic」の内容で置き換えますか');
    await page.getByTestId('confirm-ok').click();

    await expect(dialog).toHaveCount(0);
    await expect(page.locator(KEYS)).toHaveCount(2);
    await expect(page.getByTestId('undo-button')).toHaveAttribute('title', /インポートを取り消す/);

    await page.getByTestId('undo-button').click();
    // 取込後の全体表示で元のキーが表示範囲外 (描画対象外) になっているため、全体表示し直して数える。
    await page.keyboard.press('Shift+Digit1');
    await expect(page.locator(KEYS)).toHaveCount(3);
    await expect(page.getByTestId('toolbar-project-name')).toHaveText('Untitled');
  });

  test('確認ダイアログを Esc で閉じると何も変わらず、選択も解除されない', async ({ page }) => {
    await addKeys(page, 2);
    await expect(page.getByTestId('selection-count')).toHaveText('選択 2 個');

    await page.getByTestId('import-file-input').setInputFiles(MKD_BASIC);
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
    await expect(page.locator(KEYS)).toHaveCount(2);
    await expect(page.getByTestId('selection-count')).toHaveText('選択 2 個');
  });

  test('確認ダイアログ内で Tab のフォーカスが循環し、Delete がキャンバスに届かない', async ({ page }) => {
    await addKeys(page, 1);
    await page.getByTestId('import-file-input').setInputFiles(MKD_BASIC);

    await expect(page.getByTestId('confirm-ok')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('confirm-cancel')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('confirm-ok')).toBeFocused();

    await page.keyboard.press('Delete');
    await expect(page.locator(KEYS)).toHaveCount(1);
    await page.getByTestId('confirm-cancel').click();
  });

  test('壊れた JSON は理由をエラートーストに出す', async ({ page }) => {
    await page.getByTestId('import-file-input').setInputFiles(jsonFile('broken.json', '{ "keys": ['));

    const toast = page.getByTestId('toast-error');
    await expect(toast).toContainText('「broken.json」を取り込めませんでした');
    await expect(toast).toContainText('JSON として解釈できませんでした');
    await toast.getByText(/詳細/).click();
    await expect(toast).toContainText('対応形式');

    await toast.getByTestId('toast-dismiss').click();
    await expect(toast).toHaveCount(0);
  });

  test('KLE raw JSON は未対応である旨を出す', async ({ page }) => {
    await page.getByTestId('import-file-input').setInputFiles(jsonFile('kle.json', '[["Esc", "Q"]]'));
    await expect(page.getByTestId('toast-error')).toContainText('KLE 形式の取込にはまだ対応していません');
    await expect(page.locator(KEYS)).toHaveCount(0);
  });
});

test.describe('書出', () => {
  test('プロジェクト JSON をダウンロードでき、中身を取り込み直せる', async ({ page }) => {
    await addKeys(page, 3);

    await page.getByTestId('export-menu-button').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-menu-project').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('Untitled.json');
    const path = await download.path();
    const json = JSON.parse(readFileSync(path, 'utf8')) as { schemaVersion: number; keys: unknown[] };
    expect(json.schemaVersion).toBe(1);
    expect(json.keys).toHaveLength(3);
  });

  test('未実装の形式は無効表示になっている', async ({ page }) => {
    await page.getByTestId('export-menu-button').click();

    await expect(page.getByTestId('export-menu-project')).toBeEnabled();
    for (const id of ['kle', 'qmk-info', 'qmk-keymap', 'kicad', 'via', 'ergogen']) {
      await expect(page.getByTestId(`export-menu-${id}`)).toBeDisabled();
      await expect(page.getByTestId(`export-menu-${id}`)).toContainText('未対応');
    }
  });
});

test.describe('明示保存', () => {
  test('Ctrl+S で「保存しました」を出し、すぐリロードしても内容が残る', async ({ page }) => {
    await addKeys(page, 2);

    await page.keyboard.press('Control+s');
    await expect(page.getByTestId('toast-success')).toContainText('保存しました');

    // 自動保存のデバウンス (1000ms) を待たずにリロードする。
    await page.reload();
    await expect(page.locator(KEYS)).toHaveCount(2);
  });

  test('プロジェクトメニューの「保存」でも保存できる', async ({ page }) => {
    await page.getByTestId('project-menu-button').click();
    await page.getByTestId('project-menu-save').click();
    await expect(page.getByTestId('toast-success')).toContainText('保存しました');
  });
});
