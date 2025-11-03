import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';

const DEFAULT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--enable-chrome-browser-cloud-management',
];

const DEFAULT_GOTO_OPTIONS = {
  waitUntil: ['load', 'domcontentloaded', 'networkidle2'],
  timeout: 45000,
};

const CHROME_SYSTEM_PATHS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ],
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
};

const CACHE_SUBPATHS = [
  ['chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
  ['chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
  ['chrome-linux64', 'chrome'],
  ['chrome-win64', 'chrome.exe'],
];

const VERSION_SPLIT_REGEX = /[-_]/;

const compareVersionsDesc = (a, b) => {
  const aParts = (a || '').split(VERSION_SPLIT_REGEX).pop()?.split('.') ?? [];
  const bParts = (b || '').split(VERSION_SPLIT_REGEX).pop()?.split('.') ?? [];
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i += 1) {
    const aNum = Number(aParts[i] ?? 0);
    const bNum = Number(bParts[i] ?? 0);
    if (aNum > bNum) return -1;
    if (aNum < bNum) return 1;
  }
  return 0;
};

const ensureUnique = (paths) => {
  const seen = new Set();
  return paths.filter((candidate) => {
    if (!candidate) return false;
    const normalized = path.normalize(candidate);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const findCachedChromeBinaries = () => {
  try {
    const cacheRoot = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');
    if (!fs.existsSync(cacheRoot)) {
      return [];
    }

    return ensureUnique(
      fs
        .readdirSync(cacheRoot)
        .sort(compareVersionsDesc)
        .flatMap((dir) =>
          CACHE_SUBPATHS.map((subPath) =>
            path.join(cacheRoot, dir, ...subPath)
          )
        )
        .filter((candidate) => fs.existsSync(candidate))
    );
  } catch (error) {
    console.warn('[puppeteerHelpers] Failed to inspect cached Chrome binaries', error);
    return [];
  }
};

const resolveExecutableCandidates = () => {
  const envCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_EXECUTABLE_PATH,
  ];

  const cachedBinaries = findCachedChromeBinaries();

  const systemCandidates = CHROME_SYSTEM_PATHS[process.platform] ?? [];

  const fallback = puppeteer.executablePath?.() ?? null;

  return ensureUnique([
    ...envCandidates,
    ...cachedBinaries,
    ...systemCandidates,
    fallback,
  ]).filter((candidate) => fs.existsSync(candidate));
};

export async function launchBrowser(overrides = {}) {
  const mergedArgs = Array.from(
    new Set([...(overrides.args ?? []), ...DEFAULT_LAUNCH_ARGS])
  );

  const candidates = overrides.executablePath
    ? ensureUnique([overrides.executablePath])
    : resolveExecutableCandidates();

  let lastError = null;

  for (const executablePath of candidates.length > 0 ? candidates : [null]) {
    const launchOptions = {
      headless: 'new',
      ...overrides,
      args: mergedArgs,
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    } else {
      delete launchOptions.executablePath;
    }

    try {
      return await puppeteer.launch(launchOptions);
    } catch (error) {
      lastError = error;
      console.warn(
        `[puppeteerHelpers] Failed to launch Chrome at ${executablePath ?? 'default'}: ${error.message}`
      );
    }
  }

  throw lastError ?? new Error('Failed to launch Chrome with Puppeteer');
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
