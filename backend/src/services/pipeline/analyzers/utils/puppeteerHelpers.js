import puppeteer from 'puppeteer';

const DEFAULT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
];

const DEFAULT_GOTO_OPTIONS = {
  waitUntil: ['load', 'domcontentloaded', 'networkidle2'],
  timeout: 45000,
};

export async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: DEFAULT_LAUNCH_ARGS,
  });
}

export async function preparePage(page, url, auth = null, gotoOptions = {}) {
  if (auth?.username && auth?.password) {
    await page.authenticate({
      username: auth.username,
      password: auth.password,
    });
  }

  await page.goto(url, { ...DEFAULT_GOTO_OPTIONS, ...gotoOptions });
}

export { DEFAULT_GOTO_OPTIONS };
