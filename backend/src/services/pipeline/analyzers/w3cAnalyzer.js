import fetch from 'node-fetch';

const VALIDATOR_ENDPOINT = 'https://validator.w3.org/nu/?out=json';

/**
 * W3Cバリデーション実行
 * @param {Object} params
 * @param {string} params.url
 * @param {Object|null} params.auth
 * @returns {Promise<Object>}
 */
export async function analyzeW3C({ url, auth = null }) {
  console.log('[w3cAnalyzer] Starting W3C validation', { url });

  try {
    let validatorResponse;
    let sourceType = 'url';

    if (auth?.username && auth?.password) {
      console.log('[w3cAnalyzer] Fetching HTML content with basic auth');
      const basicToken = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');

      const pageResponse = await fetch(url, {
        headers: {
          Authorization: `Basic ${basicToken}`,
          'User-Agent': 'WebSiteChecker/2.0 (+https://github.com/ryog709/web-site-checker-v2)'
        }
      });

      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch page for W3C validation: ${pageResponse.status} ${pageResponse.statusText}`);
      }

      const htmlContent = await pageResponse.text();
      sourceType = 'html';

      validatorResponse = await fetch(VALIDATOR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'User-Agent': 'WebSiteChecker/2.0 (+https://github.com/ryog709/web-site-checker-v2)'
        },
        body: htmlContent
      });
    } else {
      const endpoint = `${VALIDATOR_ENDPOINT}&doc=${encodeURIComponent(url)}`;
      validatorResponse = await fetch(endpoint, {
        headers: {
          'User-Agent': 'WebSiteChecker/2.0 (+https://github.com/ryog709/web-site-checker-v2)'
        }
      });
    }

    if (!validatorResponse.ok) {
      throw new Error(`W3C validator request failed: ${validatorResponse.status} ${validatorResponse.statusText}`);
    }

    const payload = await validatorResponse.json();
    const messages = Array.isArray(payload.messages) ? payload.messages : [];

    const normalizedMessages = messages.map((message, index) => ({
      type: message.type || 'info',
      subType: message.subType || null,
      message: message.message || '',
      extract: message.extract || '',
      lastLine: message.lastLine ?? null,
      lastColumn: message.lastColumn ?? null,
      firstLine: message.firstLine ?? null,
      firstColumn: message.firstColumn ?? null,
      hiliteStart: message.hiliteStart ?? null,
      hiliteLength: message.hiliteLength ?? null,
      index
    }));

    const errorCount = normalizedMessages.filter(msg => msg.type === 'error').length;
    const warningCount = normalizedMessages.filter(msg => msg.type !== 'error').length;

    return {
      checkedAt: new Date().toISOString(),
      sourceType,
      errorCount,
      warningCount,
      messages: normalizedMessages
    };
  } catch (error) {
    console.error('[w3cAnalyzer] Validation failed', error);
    throw error;
  }
}
