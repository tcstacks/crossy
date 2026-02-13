import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to page...');
  await page.goto('http://localhost:3001/play');

  console.log('Waiting 10 seconds to see what loads...');
  await page.waitForTimeout(10000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'frontend/tests/debug-screenshot.png', fullPage: true });

  console.log('Getting page content...');
  const content = await page.content();
  console.log('Page title:', await page.title());
  console.log('Has grid class:', await page.locator('.grid').count());
  console.log('Has crossy-card class:', await page.locator('.crossy-card').count());

  await browser.close();
})();
