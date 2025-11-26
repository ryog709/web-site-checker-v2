import * as cheerio from 'cheerio';
import { resolveAbsoluteUrl } from '../../../utils/url-utils.js';

/* global document, window */

/**
 * DOM解析による各種問題検出
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Object>}
 */
export async function analyzeDom(page) {
  const content = await page.content();
  const $ = cheerio.load(content);

  return {
    headingIssues: analyzeHeadings($),
    headingStructure: getAllHeadings($),
    imageIssues: await analyzeImages($),
    imageDetails: await getAllImages($, page),
    linkIssues: analyzeLinks($),
    metaIssues: analyzeMeta($),
    metaDetails: getAllMeta($),
    htmlStructureIssues: analyzeHtmlStructure(content),
    metrics: buildBasicMetrics($, content),
    links: extractLinks($),
  };
}

function buildBasicMetrics($, content) {
  const loadTimeMs = estimateLoadTimeFromHtml(content);
  const resourceCount = countResources(content);

  return {
    loadTimeMs,
    hasTitle: $('title').length > 0,
    hasDescription: $('meta[name="description"]').length > 0,
    hasH1: $('h1').length > 0,
    imagesWithoutAlt: $('img:not([alt])').length,
    totalImages: $('img').length,
    resourceCount,
  };
}

function estimateLoadTimeFromHtml(content) {
  // 簡易推定: スクリプト/スタイル/画像の数から読み込み時間を推定
  const scriptCount = (content.match(/<script/gi) || []).length;
  const styleCount = (content.match(/<link[^>]+stylesheet/gi) || []).length;
  const imgCount = (content.match(/<img/gi) || []).length;
  return (scriptCount * 50 + styleCount * 30 + imgCount * 20) || 0;
}

function countResources(content) {
  const resourceTags = [
    /<script/gi,
    /<link/gi,
    /<img/gi,
    /<video/gi,
    /<audio/gi,
    /<source/gi,
  ];

  return resourceTags.reduce((sum, regex) => sum + (content.match(regex) || []).length, 0);
}

function getAllHeadings($) {
  const headings = $('h1, h2, h3, h4, h5, h6').get();

  return headings.map((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1), 10);
    const $heading = $(heading);
    let text = $heading.text().trim();
    const images = [];

    $heading.find('img').each((_, img) => {
      const $img = $(img);
      const alt = $img.attr('alt') || '';
      const title = $img.attr('title') || '';
      const src = $img.attr('src');
      const width = $img.attr('width');
      const height = $img.attr('height');

      const absoluteSrc = resolveAbsoluteUrl(src, global.currentUrl);

      images.push({
        src: absoluteSrc,
        alt,
        title,
        width: width ? parseInt(width, 10) : null,
        height: height ? parseInt(height, 10) : null,
        filename: src ? src.split('/').pop().split('.')[0] : '',
      });
    });

    if (!text && images.length > 0) {
      const imageTexts = images.map((img) => img.alt || img.title || img.filename || '無題画像');
      text = imageTexts.join(', ');
    }

    return {
      level,
      tag: heading.tagName.toLowerCase(),
      text: text || '',
      index,
      images,
      hasImage: images.length > 0,
      isEmpty: !text && images.length === 0,
    };
  });
}

function analyzeHeadings($) {
  const issues = [];
  const headings = $('h1, h2, h3, h4, h5, h6').get();

  let previousLevel = 0;

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1), 10);
    const $heading = $(heading);
    const text = $heading.text().trim();
    const hasImages = $heading.find('img').length > 0;

    if (!text && !hasImages) {
      issues.push({
        type: '空の見出し',
        element: heading.tagName,
        message: '見出しが空です',
        severity: 'error',
      });
    }

    if (index > 0 && level > previousLevel + 1) {
      issues.push({
        type: '見出しレベルスキップ',
        element: heading.tagName,
        message: `見出しレベルがh${previousLevel}からh${level}にスキップしています`,
        severity: 'warning',
      });
    }

    previousLevel = level;
  });

  const h1Count = $('h1').length;
  if (h1Count === 0) {
    issues.push({
      type: 'h1なし',
      message: 'h1見出しが見つかりません',
      severity: 'error',
    });
  } else if (h1Count > 1) {
    issues.push({
      type: '複数h1',
      message: `h1見出しが複数あります（${h1Count}個）`,
      severity: 'warning',
    });
  }

  return issues;
}

async function getAllImages($, page = null) {
  const images = [];

  let imagePositions = [];
  if (page) {
    try {
      imagePositions = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const viewportHeight = window.innerHeight;
        const FIRST_VIEW_THRESHOLD = 800;

        return imgs.map((img, index) => {
          const rect = img.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset;
          const absoluteTop = rect.top + scrollY;

          return {
            index,
            src: img.src,
            top: absoluteTop,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            isInFirstView: absoluteTop < FIRST_VIEW_THRESHOLD,
            isAboveFold: rect.top < viewportHeight,
          };
        });
      });
    } catch (error) {
      console.warn('Failed to get image positions:', error.message);
    }
  }

  $('img').each((index, img) => {
    const $img = $(img);
    const src = $img.attr('src');
    const alt = $img.attr('alt');
    const title = $img.attr('title');
    const width = $img.attr('width');
    const height = $img.attr('height');

    const absoluteSrc = resolveAbsoluteUrl(src, global.currentUrl);

    const isInHeader = $img.closest('header').length > 0;
    const isInNav = $img.closest('nav').length > 0;
    const isInFooter = $img.closest('footer').length > 0;

    const pictureParent = $img.closest('picture');
    let hasWebPAlternative = false;
    const webpSources = [];

    if (pictureParent.length > 0) {
      pictureParent.find('source[type="image/webp"]').each((_, source) => {
        const $source = $(source);
        const srcset = $source.attr('srcset');
        if (srcset) {
          hasWebPAlternative = true;
          webpSources.push({
            srcset,
            media: $source.attr('media') || '',
            sizes: $source.attr('sizes') || '',
          });
        }
      });
    }

    const positionInfo = imagePositions.find(
      (pos) => pos.index === index || pos.src === absoluteSrc
    );

    images.push({
      index: index + 1,
      src: absoluteSrc,
      originalSrc: src,
      alt: alt || '',
      title: title || '',
      width: width ? parseInt(width, 10) : null,
      height: height ? parseInt(height, 10) : null,
      hasAlt: !!alt,
      hasDimensions: !!(width && height),
      filename: src ? src.split('/').pop() : 'unknown',
      isInHeader,
      isInNav,
      isInFooter,
      location: isInHeader ? 'header' : isInNav ? 'nav' : isInFooter ? 'footer' : 'content',
      isInPicture: pictureParent.length > 0,
      hasWebPAlternative,
      webpSources,
      loading: $img.attr('loading') || null,
      hasLazyLoading: $img.attr('loading') === 'lazy',
      position: positionInfo
        ? {
            top: positionInfo.top,
            left: positionInfo.left,
            width: positionInfo.width,
            height: positionInfo.height,
          }
        : null,
      isInFirstView: positionInfo ? positionInfo.isInFirstView : false,
      isAboveFold: positionInfo ? positionInfo.isAboveFold : false,
    });
  });

  $('svg').each((_, svg) => {
    const $svg = $(svg);
    const role = $svg.attr('role');
    const ariaLabel = $svg.attr('aria-label');
    const ariaLabelledby = $svg.attr('aria-labelledby');
    const ariaHidden = $svg.attr('aria-hidden');
    const titleText = $svg.find('title').text();
    const classAttr = $svg.attr('class');
    const id = $svg.attr('id');

    const isDecorative =
      (role && ['presentation', 'none'].includes(role.toLowerCase())) ||
      (ariaHidden && ariaHidden.toLowerCase() === 'true');

    if (isDecorative) {
      return;
    }

    images.push({
      type: 'svg',
      role: role || '',
      ariaLabel: ariaLabel || '',
      ariaLabelledby: ariaLabelledby || '',
      ariaHidden: ariaHidden || '',
      hasTitle: titleText.length > 0,
      class: classAttr || '',
      id: id || '',
      message:
        'SVGにアクセシブルな説明が設定されていません。装飾目的なら role="presentation" を追加してください。',
    });
  });

  return images;
}

async function analyzeImages($) {
  const issues = [];
  let firstViewImageCount = 0;

  $('img').each((index, img) => {
    const $img = $(img);
    const src = $img.attr('src');
    const alt = $img.attr('alt');
    const role = ($img.attr('role') || '').toLowerCase();
    const ariaHidden = ($img.attr('aria-hidden') || '').toLowerCase();
    const isDecorative = role === 'presentation' || role === 'none' || ariaHidden === 'true';
    const isSvgImage = (src || '').toLowerCase().includes('.svg');
    const loading = $img.attr('loading');
    const width = $img.attr('width');
    const height = $img.attr('height');

    if (!alt && !(isSvgImage && isDecorative)) {
      issues.push({
        type: 'alt属性なし',
        element: 'img',
        src,
        message: '画像にalt属性がありません',
        severity: 'warning',
      });
    }

    if (!loading || loading !== 'lazy') {
      firstViewImageCount += 1;
    }

    if (!width || !height) {
      issues.push({
        type: '画像サイズ未指定',
        element: 'img',
        src,
        message: '画像にwidth/heightが設定されていません',
        severity: 'info',
      });
    }
  });

  if (firstViewImageCount > 5) {
    issues.push({
      type: '遅延読み込み不足',
      message: '遅延読み込みされていない画像が多い可能性があります',
      severity: 'info',
    });
  }

  return issues;
}

function analyzeLinks($) {
  const issues = [];

  $('a').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    const text = $link.text().trim();
    const target = $link.attr('target');
    const rel = $link.attr('rel');
    const html = $link.html();

    if (!text && !$link.find('img[alt]').length) {
      issues.push({
        type: 'リンクテキストなし',
        element: 'a',
        href,
        linkText: text || '（テキストなし）',
        linkHtml: html || '',
        message: 'リンクにアクセス可能なテキストがありません',
        severity: 'error',
      });
    }

    if (target === '_blank' && (!rel || !rel.includes('noopener'))) {
      issues.push({
        type: 'セキュリティ不備',
        element: 'a',
        href,
        linkText: text || '（テキストなし）',
        linkHtml: html || '',
        message: '外部リンクにrel="noopener"が設定されていません',
        severity: 'warning',
      });
    }
  });

  return issues;
}

function analyzeMeta($) {
  const issues = [];

  const requiredMeta = [
    { name: 'title', selector: 'title', message: 'titleタグがありません' },
    { name: 'description', selector: 'meta[name="description"]', message: 'meta descriptionが設定されていません' },
    { name: 'viewport', selector: 'meta[name="viewport"]', message: 'viewport meta tagが設定されていません' },
  ];

  requiredMeta.forEach((meta) => {
    if ($(meta.selector).length === 0) {
      issues.push({
        type: 'メタタグなし',
        element: meta.name,
        message: meta.message,
        severity: 'error',
      });
    }
  });

  const ogTags = ['og:title', 'og:description', 'og:image', 'og:url'];
  const missingOgTags = ogTags.filter((tag) => $(`meta[property="${tag}"]`).length === 0);

  if (missingOgTags.length > 0) {
    issues.push({
      type: 'OGタグなし',
      message: `Open Graphタグが不足しています: ${missingOgTags.join(', ')}`,
      severity: 'info',
    });
  }

  return issues;
}

function getAllMeta($) {
  const metaInfo = [];

  const title = $('title').text().trim();
  if (title) {
    metaInfo.push({
      type: 'title',
      name: 'ページタイトル',
      content: title,
      length: title.length,
    });
  }

  const description = $('meta[name="description"]').attr('content');
  if (description) {
    metaInfo.push({
      type: 'description',
      name: 'ページ説明',
      content: description.trim(),
      length: description.trim().length,
    });
  }

  const viewport = $('meta[name="viewport"]').attr('content');
  if (viewport) {
    metaInfo.push({
      type: 'viewport',
      name: 'ビューポート設定',
      content: viewport.trim(),
    });
  }

  const ogTags = [
    { property: 'og:title', name: 'OG タイトル' },
    { property: 'og:description', name: 'OG 説明' },
    { property: 'og:image', name: 'OG 画像' },
    { property: 'og:url', name: 'OG URL' },
  ];

  ogTags.forEach((tag) => {
    const content = $(`meta[property="${tag.property}"]`).attr('content');
    if (content) {
      metaInfo.push({
        type: tag.property,
        name: tag.name,
        content: content.trim(),
        length: content.trim().length,
      });
    }
  });

  const charset = $('meta[charset]').attr('charset');
  if (charset) {
    metaInfo.push({
      type: 'charset',
      name: '文字エンコーディング',
      content: charset.toLowerCase(),
    });
  }

  return metaInfo;
}

function extractLinks($) {
  return $('a[href]')
    .map((_, link) => {
      const $link = $(link);
      return {
        url: $link.attr('href'),
        text: $link.text().trim(),
        title: $link.attr('title') || '',
      };
    })
    .get();
}

function analyzeHtmlStructure(htmlContent) {
  const issues = [];

  try {
    checkUnclosedTags(htmlContent, issues);
    checkNestingIssues(htmlContent, issues);

    if (issues.length === 0) {
      issues.push({
        type: '正常',
        message: '閉じタグは問題ありません',
        severity: 'success',
      });
      issues.push({
        type: '正常',
        message: '不正なネスト構造はありません',
        severity: 'success',
      });
    }
  } catch (error) {
    console.warn('HTML structure analysis failed:', error.message);
  }

  return issues;
}

function checkUnclosedTags(htmlContent, issues) {
  const voidElements = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ];

  const tagRegex = /<(\/?)([\\w-]+)(?:\\s[^>]*)?>/gi;
  const stack = [];
  let match;

  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const position = match.index;

    if (voidElements.includes(tagName)) continue;

    if (isClosing) {
      const lastOpen = stack.pop();
      if (!lastOpen || lastOpen.tag !== tagName) {
        issues.push({
          type: '閉じタグ不一致',
          message: `閉じタグが不正です: </${tagName}>`,
          severity: 'error',
          position,
        });
      }
    } else {
      stack.push({ tag: tagName, position });
    }
  }

  while (stack.length > 0) {
    const unclosed = stack.pop();
    issues.push({
      type: '未閉じタグ',
      message: `タグが閉じられていません: <${unclosed.tag}>`,
      severity: 'error',
      position: unclosed.position,
    });
  }
}

function checkNestingIssues(htmlContent, issues) {
  const nestingRules = [
    {
      parent: 'a',
      invalidChildren: ['button'],
      message: 'リンクの中にボタン要素があります',
    },
  ];

  nestingRules.forEach((rule) => {
    const regex = new RegExp(`<${rule.parent}[^>]*>([\\s\\S]*?)<\\/${rule.parent}>`, 'gi');
    let match;
    while ((match = regex.exec(htmlContent)) !== null) {
      const content = match[1];
      rule.invalidChildren.forEach((child) => {
        const childRegex = new RegExp(`<${child}[\\s/>]`, 'i');
        if (childRegex.test(content)) {
          issues.push({
            type: 'ネスト不正',
            message: rule.message,
            severity: 'warning',
            position: match.index,
          });
        }
      });
    }
  });
}
