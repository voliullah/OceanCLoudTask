import { test, expect } from '@playwright/test';
// Test configuration
const TEST_DOMAINS = [
  'https://test01.p9m.net',
  'https://test03.p9m.net',
  'https://test02.p9m.net',
];

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

// TC3: Domain accessibility for each domain
for (const domain of TEST_DOMAINS) {
  test(`TC: Domain accessibility for ${domain}`, async ({ playwright }) => {
    const request = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    const response = await request.head(domain);
    expect(response.status()).toBe(200);
  });
}
