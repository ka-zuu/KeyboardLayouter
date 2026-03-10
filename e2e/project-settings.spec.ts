import { test, expect } from '@playwright/test';

test.describe('Bug Reproduction: Project Name Input', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for hydration/store init deterministically
        await expect(page.getByRole('button', { name: 'Add Keys' })).toBeVisible();
    });

    test('should allow deleting and replacing project name even with selected keys', async ({ page }) => {
        // 1. Add a key to ensure something can be selected
        await page.getByRole('button', { name: 'Add Keys' }).click();
        
        const nameInput = page.getByPlaceholder('Project Name');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toHaveValue('Untitled Project');

        await nameInput.click();
        
        // Replace text using fill for robustness
        await nameInput.fill('Untitled ');
        await expect(nameInput).toHaveValue('Untitled ');

        // Try to type Space (common conflict)
        await nameInput.press('Space');
        await expect(nameInput).toHaveValue('Untitled  '); // Space added
        
        // Type remaining
        await nameInput.fill('My Great Keyboard');
        await expect(nameInput).toHaveValue('My Great Keyboard');

        // 3. Test Undo/Redo
        // Click Undo button
        const undoBtn = page.getByTitle('Undo');
        await expect(undoBtn).toBeEnabled();
        await undoBtn.click();
        
        // Should revert to "Untitled Project" (or whatever previous state was)
        // Note: Our test started with "Untitled Project".
        // Typing "My Great Keyboard" might have been one or multiple commits depending on blur?
        // We only blurred once. So one undo should revert the name change.
        await expect(nameInput).toHaveValue('Untitled Project');
        
        // Click Redo button
        const redoBtn = page.getByTitle('Redo');
        await expect(redoBtn).toBeEnabled();
        await redoBtn.click();
        
        await expect(nameInput).toHaveValue('My Great Keyboard');
    });
});
