import { test, expect } from '@playwright/test';
import testdata from './testData.json';
import locators from './locators.json';

// ---------- Constants ----------
const DOMAINS = ['test01.p9m.net', 'test02.p9m.net', 'test03.p9m.net'];
const CACHE_TTL = '8000';

// ---------- Setup ----------
test.beforeEach(async ({ page }) => {
  await page.goto(testdata.url);
  await page.fill(locators.username, testdata.credentials.username);
  await page.fill(locators.password, testdata.credentials.password);
  await page.click(locators.loginButton);
  await expect(page.locator(locators.welcomeMessage)).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
});

// ---------- UI: Cache Path & Validation Tests ----------
test('UI: Domain listing is visible', async ({ page }) => {
  await expect(page.locator(locators.configurationButton)).toBeVisible({ timeout: 10000 });
  await page.click(locators.configurationButton);
});

test('UI: Add and delete cache path', async ({ page }) => {
  await page.click(locators.configurationButton);

  // Delete existing cache path if visible
  if (await page.locator(locators.addedCacheFile).isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.click(locators.deleteCacheButtonFile);
    await page.click(locators.saveButton);
    await page.waitForSelector(locators.successMessage, { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.click(locators.configurationButton);
  }

  await page.fill(locators.addNewCasheInput, '/file');
  await page.click(locators.addNewCasheButton);
  await expect(page.locator(locators.addedCacheFile)).toBeVisible({ timeout: 10000 });

  await page.click(locators.saveButton);
  await page.waitForSelector(locators.successMessage, { timeout: 10000 });

  // Verify persistence after reload
  await page.goto(testdata.url);
  await page.click(locators.configurationButton);
  await expect(page.locator(locators.addedCacheFile)).toBeVisible();

  // Delete cache path again to cleanup
  await page.click(locators.deleteCacheButtonFile);
  await page.click(locators.saveButton);
  await expect(page.locator(locators.successMessage)).toBeVisible({ timeout: 10000 });

  await page.goto(testdata.url);
  await page.click(locators.configurationButton);
  await expect(page.locator(locators.addedCacheFile)).toHaveCount(0);
});

test('UI: Adding invalid cache path shows error', async ({ page }) => {
  await page.click(locators.configurationButton);
  await page.fill(locators.addNewCasheInput, 'invalid path');
  await page.click(locators.addNewCasheButton);
  await expect(page.locator(locators.errorMessage)).toBeVisible();
});

test('UI: Adding path with spaces shows error', async ({ page }) => {
  await page.click(locators.configurationButton);
  await page.fill(locators.addNewCasheInput, '/path with spaces');
  await page.click(locators.addNewCasheButton);
  await page.click(locators.saveButton);
  await expect(page.locator(locators.errorMessage)).toBeVisible();
});

// ---------- Cache Rule Creation, API Validation, and Cleanup per Domain ----------
for (const domain of DOMAINS) {
  test(`Cache Rule: Create + API Validate + Cleanup for ${domain}`, async ({ page, playwright }) => {
    // Navigate to rule creation page
    await page.getByRole('button', { name: 'icon: down' }).nth(1).hover();
    await page.getByRole('menuitem', { name: 'Create rules' }).click();

    // Add new rule
    await page.getByRole('button', { name: 'Add Rule' }).click();
    await page.getByRole('textbox', { name: 'Please enter the rule name' }).fill('universalrules');
    await page.getByRole('textbox', { name: ':8001' }).fill('139.162.61.119:443');
    await page.getByRole('button', { name: 'icon: plus Add' }).click();

    // Configure Advanced cache settings
    await page.getByRole('tab', { name: 'Advanced configuration' }).click();
    await page.getByText('Cache strategy', { exact: true }).click();
    await page.getByRole('switch', { name: 'icon: close' }).click();
    await page.getByText('Advance Cache Strategy').click();
    await page.getByRole('switch', { name: 'icon: close' }).click();
    await page.locator('div').filter({ hasText: /^Custom Caching$/ }).getByRole('switch').click();
    await page.getByRole('spinbutton').fill('3');
    await page.getByRole('button', { name: 'icon: plus-circle Create rule' }).click();

    // Domain condition
    await page.getByRole('combobox').filter({ hasText: 'DOMAIN' }).locator('svg').click();
    await page.getByRole('option', { name: 'Header' }).click();
    const valueTextbox = page.locator('div').filter({ hasText: /^Value$/ }).getByRole('textbox');
    await valueTextbox.fill(domain);

    // Set cache mode to custom caching time
    await page.getByRole('combobox').filter({ hasText: 'Default Caching' }).locator('div').first().click();
    await page.getByRole('option', { name: 'Custom Caching Time' }).click();

    // Set TTL and rule name
    await page.locator('#customCacheRuleModal').getByRole('spinbutton').fill(CACHE_TTL);
    await page.getByRole('textbox', { name: 'Give your rule a descriptive' }).fill(`${CACHE_TTL}customCaching`);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Save the whole configuration
    await page.locator(locators.saveButton).click();
    await expect(page.locator(locators.successMessage)).toBeVisible({ timeout: 10000 });

    // ---------- API Validation ----------
    const request = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    const response = await request.get(`https://${domain}`);
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers['cache-control']).toBeDefined();
    expect(headers['cache-control']).toContain(`max-age=${CACHE_TTL}`);
    await request.dispose();

    // ---------- Cleanup: Delete the rule ----------
    await page.goto('https://console.uat.asians.group/#/domain/list');
    await page.getByRole('button', { name: 'icon: down' }).nth(1).hover();
    await page.getByRole('menuitem', { name: 'Create rules' }).click();

    await expect(page.getByText('universalrules')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();

    await page.waitForTimeout(3000);
    await page.reload();
    await expect(page.getByText('universalrules')).toHaveCount(0);
  });
}

// ---------- Domain accessibility & cache-control header check ----------
for (const domain of DOMAINS) {
  test(`Domain accessibility and cache headers check for ${domain}`, async ({ playwright }) => {
    const request = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    const response = await request.get(`https://${domain}`);

    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toBeTruthy(); // Optionally check for content presence

    const headers = response.headers();
    expect(headers['cache-control']).toBeDefined();

    await request.dispose();
  });
}
