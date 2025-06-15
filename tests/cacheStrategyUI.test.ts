import { test, expect } from '@playwright/test';
import testdata from './testData.json';
import locators from './locators.json';
import { time } from 'console';

test.beforeEach(async ({ page }) => {
    await page.goto(testdata.url);
    await page.fill(locators.username, testdata.credentials.username);
    await page.fill(locators.password, testdata.credentials.password);
    await page.click(locators.loginButton);
    await expect(page.locator(locators.welcomeMessage)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); 
});

test('UI: Domain can be found in domain lis', async ({ page }) => {
    await expect(page.locator(locators.configurationButton)).toBeVisible({ timeout: 10000 });
    await page.click(locators.configurationButton);
});

test('UI: Add and then delete cache path', async ({ page }) => {
    await page.click(locators.configurationButton);

    // If the cache path already exists, delete it first
    if (await page.locator(locators.addedCacheFile).isVisible({ timeout: 10000 })) {
        await page.click(locators.deleteCacheButtonFile);
        await page.click(locators.saveButton);
        await page.waitForSelector(locators.successMessage, { timeout: 100000 });
        await page.waitForTimeout(1000); // Wait for the success message to appear
        await page.click(locators.configurationButton);
    }

    // Add cache path
    await page.fill(locators.addNewCasheInput, '/file');
    await page.click(locators.addNewCasheButton);
    await expect(page.locator(locators.addedCacheFile)).toBeVisible({ timeout: 10000 });
    await page.click(locators.saveButton);
    await page.waitForSelector(locators.successMessage, { timeout: 100000 });
    await page.waitForTimeout(1000); // Wait for the success message to appear
    await expect(page.locator(locators.successMessage)).toBeVisible();
    await page.goto(testdata.url);

    // Wait for the configuration button to be visible and enabled before clicking
    await expect(page.locator(locators.configurationButton)).toBeVisible({ timeout: 100000 });
    await page.click(locators.configurationButton);
    await expect(page.locator(locators.addedCacheFile)).toBeVisible();

    // Now delete the cache path
    await page.click(locators.deleteCacheButtonFile);
    await page.click(locators.saveButton);
    await expect(page.locator(locators.successMessage)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000); 

    await page.goto(testdata.url);
    await page.waitForSelector(locators.configurationButton, { timeout: 10000 });
    await page.click(locators.configurationButton);
    await expect(page.locator(locators.addedCacheFile)).toHaveCount(0);
});

test('UI: Add invalid cache path shows error', async ({ page }) => {
    await page.click(locators.configurationButton);
    await page.fill(locators.addNewCasheInput, 'invalid path');
    await page.click(locators.addNewCasheButton);
    await expect(page.locator(locators.errorMessage)).toBeVisible();
});

test.only('UI: Add cache path with spaces', async ({ page }) => {
    await page.click(locators.configurationButton);
    await page.fill(locators.addNewCasheInput, '/path with spaces');
    await page.click(locators.addNewCasheButton);
    // await expect(page.locator(locators.addedCacheFile)).not.toBeVisible({ timeout: 10000 });
    await page.click(locators.saveButton);
    await expect(page.locator(locators.errorMessage)).toBeVisible();
});

