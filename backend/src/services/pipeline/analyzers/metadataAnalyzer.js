import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const REQUIRED_META = [
  {
    selector: 'meta[name="description"]',
    label: 'meta description',
    message: 'meta description が設定されていません',
  },
  {
    selector: 'meta[name="viewport"]',
    label: 'meta viewport',
    message: 'レスポンシブ対応の meta viewport が設定されていません',
  },
  {
    selector: 'meta[charset]',
    label: 'meta charset',
    message: '文字コードを指定する meta charset が見つかりません',
  },
];

const OG_TAGS = [
  'og:title',
  'og:description',
  'og:type',
  'og:url',
  'og:image',
];

const TWITTER_TAGS = [
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
];

const ICON_RELS = ['icon', 'shortcut icon', 'apple-touch-icon', 'mask-icon'];

function resolveUrl(baseUrl, url) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url || '';
  }
}

export async function analyzeMetadata({ url, auth = null }) {
  console.log('[metadataAnalyzer] Starting metadata analysis', { url });

  try {
    const headers = {
      'User-Agent': 'WebSiteChecker/2.0 (+https://github.com/ryog709/web-site-checker-v2)',
    };

    if (auth?.username && auth?.password) {
      headers.Authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
    }

    const response = await fetch(url, { headers, timeout: 45000 });

    if (!response.ok) {
      throw new Error(`Failed to fetch page for metadata analysis: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const issues = [];

    REQUIRED_META.forEach((meta) => {
      if ($(meta.selector).length === 0) {
        issues.push({
          type: 'missing-meta',
          element: meta.label,
          severity: 'warning',
          message: meta.message,
        });
      }
    });

    const ogTags = OG_TAGS.map((property) => ({
      property,
      content: $(`meta[property="${property}"]`).attr('content') || '',
    }));

    const missingOgTags = ogTags.filter((tag) => !tag.content).map((tag) => tag.property);
    if (missingOgTags.length > 0) {
      issues.push({
        type: 'missing-ogp',
        severity: 'warning',
        message: `次のOGPタグが不足しています: ${missingOgTags.join(', ')}`,
      });
    }

    const twitterTags = TWITTER_TAGS.map((name) => ({
      name,
      content: $(`meta[name="${name}"]`).attr('content') || '',
    }));

    const icons = ICON_RELS.flatMap((rel) =>
      $(`link[rel="${rel}"]`).map((_, el) => ({
        rel,
        href: resolveUrl(url, $(el).attr('href') || ''),
        sizes: $(el).attr('sizes') || '',
        type: $(el).attr('type') || '',
      })).get(),
    );

    if (icons.length === 0) {
      issues.push({
        type: 'missing-icon',
        severity: 'info',
        message: 'ファビコン / タッチアイコンが設定されていない可能性があります',
      });
    }

    const jsonLdScripts = $('script[type="application/ld+json"]').get();
    const jsonLd = jsonLdScripts.map((script, index) => {
      const raw = $(script).contents().text().trim();
      let parsed = null;
      let error = null;
      let type = 'Unknown';

      if (raw) {
        try {
          parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            type = parsed.map((item) => item['@type']).filter(Boolean).join(', ') || 'Array';
          } else if (parsed['@type']) {
            type = parsed['@type'];
          }
        } catch (err) {
          error = err.message;
          issues.push({
            type: 'invalid-jsonld',
            severity: 'error',
            message: `JSON-LDのパースに失敗しました: ${err.message}`,
          });
        }
      }

      return {
        index,
        type,
        raw,
        parsed,
        error,
      };
    });

    const summary = {
      hasDescription: REQUIRED_META[0] ? $(REQUIRED_META[0].selector).length > 0 : false,
      hasViewport: REQUIRED_META[1] ? $(REQUIRED_META[1].selector).length > 0 : false,
      ogTagCount: ogTags.filter((tag) => tag.content).length,
      twitterTagCount: twitterTags.filter((tag) => tag.content).length,
      iconCount: icons.length,
      jsonLdCount: jsonLd.length,
      checkedAt: new Date().toISOString(),
    };

    return {
      summary,
      issues,
      ogTags,
      twitterTags,
      icons,
      jsonLd,
    };
  } catch (error) {
    console.error('[metadataAnalyzer] Analysis failed', error);
    throw error;
  }
}
