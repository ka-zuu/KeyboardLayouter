import { Page } from '@playwright/test';

type MkdStore = {
  getState: () => {
    project: { keys: { id: string; position: { x: number; y: number }; size: { w: number; h: number }; matrix: { row: number; col: number } }[] };
    selectedKeyIds: string[];
    selectKey: (id: string, multi: boolean) => void;
    clearSelection: () => void;
    setPan: (pan: { x: number; y: number }) => void;
  };
};

declare global {
  interface Window {
    __mkd_store?: MkdStore;
  }
}

/** Wait for window.__mkd_store to be available (store mounted) */
export async function waitForStore(page: Page) {
  await page.waitForFunction(() => window.__mkd_store !== undefined);
}

/** Get current project state from the Zustand store */
export async function getProject(page: Page) {
  return page.evaluate(() => window.__mkd_store!.getState().project);
}

/** Get current selected key IDs */
export async function getSelectedIds(page: Page) {
  return page.evaluate(() => window.__mkd_store!.getState().selectedKeyIds);
}

/** Wait until the project has at least `count` keys */
export async function waitForKeys(page: Page, count = 1) {
  await page.waitForFunction(
    (n) => (window.__mkd_store?.getState()?.project?.keys?.length ?? 0) >= n,
    count
  );
}

/** Select a key by its ID without reloading the page */
export async function selectKeyById(page: Page, id: string, multi = false) {
  await page.evaluate(
    ([keyId, isMulti]) => window.__mkd_store!.getState().selectKey(keyId as string, isMulti as boolean),
    [id, multi]
  );
}

/** Set pan via store action (no reload needed) */
export async function setPan(page: Page, x: number, y: number) {
  await page.evaluate(([px, py]) => window.__mkd_store!.getState().setPan({ x: px as number, y: py as number }), [x, y]);
}

/** Clear IndexedDB and localStorage, then reload for a clean state */
export async function clearStorageAndReload(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('mkd-db');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve(); // ignore errors
    });
  });
  await page.reload();
  await waitForStore(page);
}
