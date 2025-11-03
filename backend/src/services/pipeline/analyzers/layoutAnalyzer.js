import { launchBrowser, preparePage } from './utils/puppeteerHelpers.js';

/* global document, window */

const DEFAULT_VIEWPORTS = [
  { width: 1920, height: 1080, label: 'desktop-1920' },
  { width: 1440, height: 900, label: 'desktop-1440' },
  { width: 1441, height: 900, label: 'desktop-1440-plus-1' },
  { width: 1439, height: 900, label: 'desktop-1440-minus-1' },
  { width: 1024, height: 768, label: 'tablet-1024' },
  { width: 769, height: 1024, label: 'tablet-breakpoint-plus-1' },
  { width: 767, height: 1024, label: 'tablet-breakpoint-minus-1' },
  { width: 376, height: 812, label: 'mobile-375-plus-1' },
  { width: 375, height: 812, label: 'mobile-375' },
  { width: 320, height: 568, label: 'mobile-320' }
];

const MAX_OVERFLOW_ELEMENTS = 5;

/**
 * レイアウト解析
 * @param {Object} params
 * @param {string} params.url
 * @param {Object|null} params.auth
 * @param {Array} [params.viewports]
 * @returns {Promise<Object>}
 */
export async function analyzeLayout({ url, auth = null, viewports = DEFAULT_VIEWPORTS }) {
  console.log('[layoutAnalyzer] Starting layout analysis', {
    url,
    viewportCount: viewports.length
  });

  const browser = await launchBrowser();

  const results = [];

  try {
    for (const viewport of viewports) {
      let page;
      const viewportResult = {
        label: viewport.label,
        width: viewport.width,
        height: viewport.height,
        checkedAt: new Date().toISOString()
      };

      try {
        page = await browser.newPage();

        await page.setViewport({
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1
        });

        await preparePage(page, url, auth);

        // レイアウト情報を取得
        const layoutInfo = await page.evaluate((maxElements) => {
          const buildElementSelector = (element) => {
            if (!element || !element.tagName) {
              return 'unknown';
            }

            const parts = [element.tagName.toLowerCase()];

            if (element.id) {
              parts.push(`#${element.id}`);
            }

            if (element.classList && element.classList.length > 0) {
              const classes = Array.from(element.classList).slice(0, 3).join('.');
              if (classes) {
                parts.push(`.${classes}`);
              }
            }

            return parts.join('');
          };

          const viewportWidth = Math.round(window.innerWidth);
          const documentWidth = Math.round(Math.max(
            document.documentElement.scrollWidth,
            document.body?.scrollWidth || 0
          ));
          const horizontalOverflow = Math.max(0, documentWidth - viewportWidth);

          const overflowElements = [];

          if (horizontalOverflow > 0) {
            const candidates = Array.from(document.body.querySelectorAll('*'));
            for (const el of candidates) {
              const rect = el.getBoundingClientRect();
              if (!rect || rect.width === 0 || rect.height === 0) {
                continue;
              }

              const overflow = Math.round(rect.right - viewportWidth);
              if (overflow > 0) {
                overflowElements.push({
                  selector: buildElementSelector(el),
                  overflow,
                  rect: {
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top)
                  },
                  textSnippet: el.textContent ? el.textContent.trim().slice(0, 80) : ''
                });

                if (overflowElements.length >= maxElements) {
                  break;
                }
              }
            }
          }

          return {
            viewportWidth,
            documentWidth,
            horizontalOverflow,
            hasHorizontalOverflow: horizontalOverflow > 0,
            overflowElements
          };
        }, MAX_OVERFLOW_ELEMENTS);

        Object.assign(viewportResult, layoutInfo);
        console.log('[layoutAnalyzer] Viewport checked', {
          label: viewport.label,
          hasOverflow: layoutInfo.hasHorizontalOverflow,
          overflowAmount: layoutInfo.horizontalOverflow
        });
      } catch (error) {
        console.warn('[layoutAnalyzer] Viewport analysis failed', {
          label: viewport.label,
          error: error.message
        });

        viewportResult.error = error.message;
      } finally {
        if (page) {
          await page.close();
        }
      }

      results.push(viewportResult);
    }

    const overflowViewports = results.filter(result => result.hasHorizontalOverflow).length;

    return {
      summary: {
        totalViewports: results.length,
        overflowViewports,
        hasOverflow: overflowViewports > 0,
        checkedAt: new Date().toISOString()
      },
      viewports: results
    };
  } catch (error) {
    console.error('[layoutAnalyzer] Layout analysis failed', error);
    throw error;
  } finally {
    await browser.close();
  }
}
