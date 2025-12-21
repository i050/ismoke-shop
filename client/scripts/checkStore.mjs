import puppeteer from 'puppeteer';

const url = 'http://localhost:5173/user-management';

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
try {
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait until the store is exposed on window
  await page.waitForFunction(() => !!window.__APP_STORE__, { timeout: 10000 });

  const state = await page.evaluate(() => {
    const s = window.__APP_STORE__.getState();
    return {
      usersLength: s.userManagement?.users?.length || 0,
      users: s.userManagement?.users || [],
      pagination: s.userManagement?.pagination || null,
    };
  });

  console.log('Redux userManagement state:', JSON.stringify(state, null, 2));
} catch (err) {
  console.error('Error checking store:', err);
} finally {
  await browser.close();
}
