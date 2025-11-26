import puppeteer from 'puppeteer';
import os from 'os';
import fs from 'fs';

/**
 * OSごとのChrome実行パスを返す
 * @returns {string|null}
 */
export function getChromeExecutablePath() {
  const platform = os.platform();

  const chromePaths = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    ],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/chrome',
      '/snap/bin/chromium',
    ],
  };

  const pathsToTry = chromePaths[platform] || [];

  for (const candidate of pathsToTry) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ファイルチェック失敗は無視して次を試す
      continue;
    }
  }

  return null;
}

/**
 * Puppeteerの起動オプションを組み立て
 * @returns {Object}
 */
export function getBrowserConfig() {
  const executablePath = getChromeExecutablePath();

  const config = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--enable-chrome-browser-cloud-management',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--remote-debugging-port=0',
    ],
  };

  if (executablePath) {
    config.executablePath = executablePath;
  }

  return config;
}

/**
 * Puppeteerブラウザをリトライ付きで起動
 * @param {number} maxRetries
 * @returns {Promise<import('puppeteer').Browser>}
 */
export async function launchBrowserWithRetry(maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await puppeteer.launch(getBrowserConfig());
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        console.warn(`Browser launch failed after ${maxRetries} attempts:`, error.message);
        try {
          const fallbackConfig = getBrowserConfig();
          delete fallbackConfig.executablePath;
          return await puppeteer.launch(fallbackConfig);
        } catch (fallbackError) {
          console.error('Browser launch failed with fallback:', fallbackError.message);
          throw new Error(
            `Browser launch failed after ${maxRetries} attempts. Original error: ${lastError.message}. Fallback error: ${fallbackError.message}`
          );
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw lastError ?? new Error('Browser launch failed');
}

/**
 * ベーシック認証を設定
 * @param {import('puppeteer').Page} page
 * @param {Object} auth
 */
export async function setupAuth(page, auth) {
  if (auth?.username && auth?.password) {
    await page.authenticate({
      username: auth.username,
      password: auth.password,
    });
  }
}
