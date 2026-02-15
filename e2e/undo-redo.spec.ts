import { test, expect, Page } from '@playwright/test';

// Define minimal shape of ProjectData for testing
interface TestKeyData {
    position: { x: number; y: number };
}
interface TestProjectData {
    keys: TestKeyData[];
}

test.describe('Undo/Redo Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(async () => {
            localStorage.clear();
            if (window.indexedDB) {
                const req = indexedDB.deleteDatabase('mkd-db');
                await new Promise<void>((resolve) => {
                    req.onsuccess = () => resolve();
                    req.onerror = () => resolve();
                    req.onblocked = () => resolve();
                });
            }
        });
        await page.reload();
        await page.waitForSelector('canvas');
    });

    const getProjectFromIDB = async (page: Page): Promise<TestProjectData | null> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return page.evaluate(async (): Promise<any> => {
            return new Promise((resolve) => {
                const req = indexedDB.open('mkd-db', 1);
                req.onsuccess = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('keyval')) {
                        resolve(null); return;
                    }
                    const tx = db.transaction('keyval', 'readonly');
                    const store = tx.objectStore('keyval');
                    const getReq = store.get('mkd-storage');
                    getReq.onsuccess = () => {
                        const val = getReq.result;
                        if (val && val.state && val.state.project) {
                            resolve(val.state.project);
                        } else {
                            resolve(null);
                        }
                    };
                    getReq.onerror = () => resolve(null);
                };
                req.onerror = () => resolve(null);
            });
        });
    };

    test('should undo key drag in a single step using UI button', async ({ page }) => {
        // 1. Add a key
        await page.click('button:has-text("Add Keys")');

        let initialProject: TestProjectData | null = null;
        for(let i=0; i<30; i++) {
            initialProject = await getProjectFromIDB(page);
            if(initialProject && initialProject.keys.length > 0) break;
            await page.waitForTimeout(200);
        }
        expect(initialProject).not.toBeNull();

        const initialPos = initialProject!.keys[0].position;

        // 2. Drag the key
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const startX = box.x + 30;
        const startY = box.y + 30;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 100, startY + 100, { steps: 5 });
        await page.mouse.up();

        await page.waitForTimeout(1100);

        let movedProject: TestProjectData | null = null;
        for(let i=0; i<10; i++) {
             movedProject = await getProjectFromIDB(page);

             const pos = movedProject!.keys[0].position;
             if (Math.abs(pos.x - initialPos.x) > 0.1) break;
             await page.waitForTimeout(200);
        }


        const movedPos = movedProject!.keys[0].position;
        expect(movedPos.x).toBeGreaterThan(initialPos.x);

        // 3. Click Undo Button
        const undoBtn = page.getByTitle('Undo');
        await expect(undoBtn).toBeEnabled();
        await undoBtn.click();

        await page.waitForTimeout(1500);

        const undoPos1Project = await getProjectFromIDB(page);

        const undoPos1 = undoPos1Project!.keys[0].position;

        const matchInitial =
            Math.abs(undoPos1.x - initialPos.x) < 0.01 &&
            Math.abs(undoPos1.y - initialPos.y) < 0.01;

        expect(matchInitial).toBe(true);
    });

    test('should undo key drag in a single step using keyboard shortcut (Meta+Z)', async ({ page }) => {
        // 1. Add a key
        await page.click('button:has-text("Add Keys")');

        let initialProject: TestProjectData | null = null;
        for(let i=0; i<30; i++) {
            initialProject = await getProjectFromIDB(page);
            if(initialProject && initialProject.keys.length > 0) break;
            await page.waitForTimeout(200);
        }
        expect(initialProject).not.toBeNull();

        const initialPos = initialProject!.keys[0].position;

        // 2. Drag the key
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const startX = box.x + 30;
        const startY = box.y + 30;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 100, startY + 100, { steps: 5 });
        await page.mouse.up();

        await page.waitForTimeout(1100);

        let movedProject: TestProjectData | null = null;
        for(let i=0; i<10; i++) {
             movedProject = await getProjectFromIDB(page);

             const pos = movedProject!.keys[0].position;
             if (Math.abs(pos.x - initialPos.x) > 0.1) break;
             await page.waitForTimeout(200);
        }


        const movedPos = movedProject!.keys[0].position;
        expect(movedPos.x).toBeGreaterThan(initialPos.x);

        // 3. Press Undo Shortcut (Meta+Z)
        await page.keyboard.press('Meta+z');

        await page.waitForTimeout(1500);

        const undoPos1Project = await getProjectFromIDB(page);

        const undoPos1 = undoPos1Project!.keys[0].position;

        const matchInitial =
            Math.abs(undoPos1.x - initialPos.x) < 0.01 &&
            Math.abs(undoPos1.y - initialPos.y) < 0.01;

        if (!matchInitial) {
             console.log('Shortcut Undo failed. Current:', undoPos1, 'Initial:', initialPos);
        }

        expect(matchInitial).toBe(true);

        // 4. Redo (Meta+Shift+Z)
        await page.keyboard.press('Meta+Shift+z');
        await page.waitForTimeout(1500);

        const redoPosProject = await getProjectFromIDB(page);

        const redoPos = redoPosProject!.keys[0].position;

        expect(redoPos.x).toBeCloseTo(movedPos.x, 1);
        expect(redoPos.y).toBeCloseTo(movedPos.y, 1);
    });
});
