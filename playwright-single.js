require('dotenv').config();

const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const cp = require('child_process');
const fs = require('fs');

if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

const playwrightClientVersion = cp
  .execSync('npx playwright --version')
  .toString()
  .trim()
  .split(' ')[1];

const combinations = [
  {
    browserName: 'Chrome',
    platform: 'macOS Sequoia'
  },
  {
    browserName: 'MicrosoftEdge',
    platform: 'Windows 10'
  }
];

function safeName(text) {
  return text.replace(/[^a-zA-Z0-9]/g, '_');
}

(async () => {
  console.log('Starting Playwright tests...');
  console.log('Playwright version:', playwrightClientVersion);

  await Promise.all(
    combinations.map(async combo => {
      console.log(`Starting run: ${combo.browserName} on ${combo.platform}`);

      const capabilities = {
        browserName: combo.browserName,
        browserVersion: 'latest',
        'LT:Options': {
          platform: combo.platform,
          build: 'Playwright Combined Build',
          name: `TestMu Scenarios - ${combo.browserName} on ${combo.platform}`,
          user: process.env.LT_USERNAME,
          accessKey: process.env.LT_ACCESS_KEY,
          network: true,
          video: true,
          visual: true,
          console: true,
          tunnel: false,
          terminal: true,
          playwrightClientVersion: playwrightClientVersion
        }
      };

      console.log('Connecting to LambdaTest...');
      console.log('Username:', process.env.LT_USERNAME);
      console.log(`Platform: ${combo.platform}, Browser: ${combo.browserName}`);

      const browser = await chromium.connect({
        wsEndpoint: `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(
          JSON.stringify(capabilities)
        )}`
      });

      console.log(`Connected successfully: ${combo.browserName} on ${combo.platform}`);

      const page = await browser.newPage();

      page.on('console', message => console.log(`[console] ${message.type()}: ${message.text()}`));
      page.on('request', request => console.log(`[request] ${request.method()} ${request.url()}`));
      page.on('response', response => console.log(`[response] ${response.status()} ${response.url()}`));

      try {
        console.log('Running Test Scenario 1 - Simple Form Demo');

        const message = 'Welcome to TestMu AI';

        await page.goto('https://www.testmuai.com/selenium-playground/');

        await page.getByRole('link', { name: 'Simple Form Demo' }).click();

        await expect(page).toHaveURL(/simple-form-demo/);

        const allowAll1 = page.getByRole('button', { name: 'Allow all' });

        try {
          await allowAll1.waitFor({ state: 'visible', timeout: 15000 });
          await allowAll1.click();
          console.log('Cookie popup accepted');
        } catch {
          console.log('Cookie popup did not appear');
        }

        await page.getByRole('textbox', { name: 'Please enter your Message' }).fill(message);

        await page.getByRole('button', { name: 'Get Checked Value' }).click();

        const outputMessage = page.locator('p#message').last();
        await expect(outputMessage).toHaveText(message, { timeout: 10000 });

        await page.screenshot({
          path: `screenshots/scenario1_${safeName(combo.browserName)}_${safeName(combo.platform)}.png`,
          fullPage: true
        });

        console.log('Running Test Scenario 2 - Drag and Drop Slider');

        await page.goto('https://www.testmuai.com/selenium-playground/');
        await page.getByRole('link', { name: 'Drag & Drop Sliders' }).click();

        const allowAll2 = page.getByRole('button', { name: 'Allow all' });
        await page.waitForTimeout(500);

        const slider = page.locator('input[type="range"][value="15"]');
        await slider.fill('95', { force: true });

        const sliderOutput = slider.locator('xpath=following-sibling::output');

        await expect(sliderOutput).toHaveText('95');

        await page.screenshot({
          path: `screenshots/scenario2_${safeName(combo.browserName)}_${safeName(combo.platform)}.png`,
          fullPage: true
        });

        console.log('Running Test Scenario 3 - Input Form Submit');

        await page.goto('https://www.testmuai.com/selenium-playground/');
        await page.getByRole('link', { name: 'Input Form Submit' }).click();

        await page.waitForTimeout(500);

        const submitButton = page.getByRole('button', { name: 'Submit' });

        await submitButton.click();

        const validationMessage = await page.evaluate(() => {
          const invalidField = document.querySelector('input:invalid, select:invalid, textarea:invalid');
          return invalidField ? invalidField.validationMessage : '';
        });

        expect(validationMessage).toContain('Please fill');

        await page.getByRole('textbox', { name: 'Name' }).fill('Redwan Alabed');

        await page.getByRole('textbox', { name: 'Email' }).fill('redwan@example.com');
        await page.getByRole('textbox', { name: 'Password' }).fill('Password123!');
        await page.getByRole('textbox', { name: 'Company' }).fill('TestMu AI');
        await page.getByRole('textbox', { name: 'Website' }).fill('https://example.com');

        await page.selectOption('select[name="country"]', { label: 'United States' });

        await page.getByRole('textbox', { name: 'City', exact: true }).fill('New York');
        await page.getByRole('textbox', { name: 'Address 1' }).fill('123 Test Street');
        await page.getByRole('textbox', { name: 'Address 2' }).fill('Apartment 1');
        await page.getByRole('textbox', { name: 'City* State*' }).fill('New York');
        await page.getByRole('textbox', { name: 'Zip code' }).fill('10001');

        await page.getByRole('button', { name: 'Submit' }).click();

        await expect(
          page.getByText('Thanks for contacting us, we will get back to you shortly.')
        ).toBeVisible();

        await page.screenshot({
          path: `screenshots/scenario3_${safeName(combo.browserName)}_${safeName(combo.platform)}.png`,
          fullPage: true
        });

        console.log(`All scenarios PASSED on ${combo.browserName} / ${combo.platform}`);

        await page.evaluate(
          _ => {},
          `lambdatest_action: ${JSON.stringify({
            action: 'setTestStatus',
            arguments: {
              status: 'passed',
              remark: `All three scenarios passed on ${combo.browserName} / ${combo.platform}`
            }
          })}`
        );

        await teardown(page, browser);
      } catch (e) {
        console.log(`Test FAILED on ${combo.browserName} / ${combo.platform}`);
        console.log('Error:', e.message);

        await page.screenshot({
          path: `screenshots/failed_${safeName(combo.browserName)}_${safeName(combo.platform)}.png`,
          fullPage: true
        });

        await page.evaluate(
          _ => {},
          `lambdatest_action: ${JSON.stringify({
            action: 'setTestStatus',
            arguments: {
              status: 'failed',
              remark: e.stack
            }
          })}`
        );

        await teardown(page, browser);
        throw e;
      }
    })
  );
})().catch(err => {
  console.error('Unexpected error occurred:');
  console.error(err);
  process.exit(1);
});

async function teardown(page, browser) {
  console.log('Cleaning up resources...');
  await page.close();
  await browser.close();
  console.log('Test completed and resources cleaned up!');
}
