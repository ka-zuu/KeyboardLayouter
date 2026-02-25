import { test, expect } from '@playwright/test';

test.describe('Matrix Auto-Assignment', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('button', { name: 'Add Keys' })).toBeVisible();
    });

    test('should auto-assign matrix values based on visual position with default (0,0)', async ({ page }) => {
        // 1. Add 3 keys
        const countInput = page.locator('div').filter({ hasText: /^Count:$/ }).getByRole('spinbutton');
        await countInput.fill('3');
        await page.getByRole('button', { name: 'Add Keys' }).click();

        // 2. Clear selection (click background far away)
        await page.getByTestId('main-canvas').locator('.konvajs-content').click({ position: { x: 500, y: 500 } });

        // 3. Run Auto-assign (All) with default 0,0
        // Use test id
        const startRowInput = page.getByTestId('matrix-start-row');
        await expect(startRowInput).toBeVisible();
        await expect(startRowInput).toHaveValue('0');

        await page.getByRole('button', { name: 'Auto-assign Matrix (All)' }).click();
        
        // 4. Verify
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projectData: any = await page.evaluate(() => {
             const storage = localStorage.getItem('mkd-storage');
             if (!storage) return null;
             return JSON.parse(storage).state.project;
        });
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const keys = projectData.keys as any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sorted = keys.sort((a: any, b: any) => a.position.x - b.position.x);
        
        expect(sorted[0].matrix).toEqual({ row: 0, col: 0 });
        expect(sorted[1].matrix).toEqual({ row: 0, col: 1 });
        expect(sorted[2].matrix).toEqual({ row: 0, col: 2 });
    });

    test('should auto-assign matrix with custom start row/col', async ({ page }) => {
        // 1. Add 3 keys
        const countInput = page.locator('div').filter({ hasText: /^Count:$/ }).getByRole('spinbutton');
        await countInput.fill('3');
        await page.getByRole('button', { name: 'Add Keys' }).click();

        // 2. Clear selection
        await page.getByTestId('main-canvas').locator('.konvajs-content').click({ position: { x: 500, y: 500 } });

        // 3. Set custom start row/col
        const startRowInput = page.getByTestId('matrix-start-row');
        const startColInput = page.getByTestId('matrix-start-col');
        
        await startRowInput.fill('4');
        await startColInput.fill('4');

        // 4. Click Auto-assign (All)
        await page.getByRole('button', { name: 'Auto-assign Matrix (All)' }).click();

        // 5. Verify
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projectData: any = await page.evaluate(() => {
             const storage = localStorage.getItem('mkd-storage');
             if (!storage) return null;
             return JSON.parse(storage).state.project;
        });
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const keys = projectData.keys as any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sorted = keys.sort((a: any, b: any) => a.position.x - b.position.x);
        
        expect(sorted[0].matrix).toEqual({ row: 4, col: 4 });
        expect(sorted[1].matrix).toEqual({ row: 4, col: 5 });
        expect(sorted[2].matrix).toEqual({ row: 4, col: 6 });
    });
});
