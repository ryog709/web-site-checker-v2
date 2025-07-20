// Simple URL validation function
function validateUrl(url) {
  try {
    new URL(url);
    return null; // No error
  } catch (error) {
    return 'Invalid URL format';
  }
}

// HTML parser without external dependencies
class SimpleHTMLParser {
  constructor(html) {
    this.html = html;
  }

  // Extract text content from HTML string
  getTextContent(htmlString) {
    return htmlString.replace(/<[^>]*>/g, '').trim();
  }

  // Get all elements by tag name
  getElementsByTagName(tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>.*?<\/${tagName}>`, 'gis');
    return this.html.match(regex) || [];
  }

  // Get all self-closing elements by tag name
  getSelfClosingElements(tagName) {
    const regex = new RegExp(`<${tagName}[^>]*\/?>`, 'gi');
    return this.html.match(regex) || [];
  }

  // Extract attribute value
  getAttributeValue(element, attribute) {
    const regex = new RegExp(`${attribute}=["']([^"']*)["']`, 'i');
    const match = element.match(regex);
    return match ? match[1] : null;
  }

  // Analyze headings structure
  analyzeHeadings() {
    const headings = [];
    const issues = [];
    let previousLevel = 0;

    for (let level = 1; level <= 6; level++) {
      const tagElements = this.getElementsByTagName(`h${level}`);
      
      tagElements.forEach((element, index) => {
        const text = this.getTextContent(element).trim();
        const isEmpty = !text;
        
        // Check for images in heading
        const images = this.getSelfClosingElements('img').filter(img => 
          element.includes(img)
        ).map(img => ({
          src: this.getAttributeValue(img, 'src') || '',
          alt: this.getAttributeValue(img, 'alt') || '',
          title: this.getAttributeValue(img, 'title') || '',
          width: null,
          height: null,
          filename: this.getAttributeValue(img, 'src')?.split('/').pop() || ''
        }));

        const heading = {
          level,
          tag: `h${level}`,
          text,
          index: headings.length + 1,
          images,
          hasImage: images.length > 0,
          isEmpty
        };

        headings.push(heading);

        // Check heading hierarchy
        if (level > previousLevel + 1 && previousLevel > 0) {
          issues.push({
            type: 'heading-hierarchy',
            element: `h${level}`,
            message: `見出しレベルがスキップされています（h${previousLevel}からh${level}）`,
            severity: 'warning',
            position: headings.length,
            suggestion: `h${previousLevel + 1}を使用してください`
          });
        }

        // Check empty headings
        if (isEmpty) {
          issues.push({
            type: 'empty-heading',
            element: `h${level}`,
            message: '空の見出し要素です',
            severity: 'error',
            position: headings.length,
            suggestion: '見出しにテキストコンテンツを追加してください'
          });
        }

        previousLevel = level;
      });
    }

    return { headings, issues };
  }

  // Analyze images
  analyzeImages() {
    const images = this.getSelfClosingElements('img');
    const allImages = [];
    const issues = [];

    images.forEach((img, index) => {
      const src = this.getAttributeValue(img, 'src');
      const alt = this.getAttributeValue(img, 'alt');
      const title = this.getAttributeValue(img, 'title');
      const width = this.getAttributeValue(img, 'width');
      const height = this.getAttributeValue(img, 'height');
      const loading = this.getAttributeValue(img, 'loading');

      const imageInfo = {
        index: index + 1,
        src: src || '',
        originalSrc: src || '',
        alt: alt || '',
        title: title || '',
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        hasAlt: alt !== null && alt !== '',
        hasDimensions: width !== null && height !== null,
        filename: src ? src.split('/').pop() : '',
        loading: loading,
        hasLazyLoading: loading === 'lazy'
      };

      allImages.push(imageInfo);

      // Check for missing alt attributes
      if (!imageInfo.hasAlt) {
        issues.push({
          type: 'missing-alt',
          element: 'img',
          message: 'alt属性が設定されていません',
          severity: 'error',
          src: src,
          suggestion: '画像の内容を説明するalt属性を追加してください'
        });
      }

      // Check for missing dimensions
      if (!imageInfo.hasDimensions) {
        issues.push({
          type: 'missing-dimensions',
          element: 'img',
          message: '画像のサイズが指定されていません',
          severity: 'warning',
          src: src,
          suggestion: 'widthとheight属性を追加してレイアウトシフトを防いでください'
        });
      }
    });

    return { allImages, issues };
  }

  // Analyze links
  analyzeLinks() {
    const linkRegex = /<a[^>]*href[^>]*>.*?<\/a>/gis;
    const links = this.html.match(linkRegex) || [];
    const issues = [];

    links.forEach((link, index) => {
      const href = this.getAttributeValue(link, 'href');
      const text = this.getTextContent(link).trim();
      const title = this.getAttributeValue(link, 'title');

      // Check for empty link text
      if (!text) {
        issues.push({
          type: 'empty-link-text',
          element: 'a',
          message: 'リンクテキストが空です',
          severity: 'error',
          href: href,
          suggestion: 'リンクの目的を説明するテキストを追加してください'
        });
      }

      // Check for generic link text
      const genericTexts = ['こちら', 'click here', 'here', 'read more', 'more'];
      if (genericTexts.some(generic => text.toLowerCase().includes(generic))) {
        issues.push({
          type: 'generic-link-text',
          element: 'a',
          message: '一般的すぎるリンクテキストです',
          severity: 'warning',
          linkText: text,
          href: href,
          suggestion: 'リンク先の内容を具体的に説明するテキストに変更してください'
        });
      }
    });

    return { issues };
  }

  // Analyze meta information
  analyzeMeta() {
    const metaRegex = /<meta[^>]*>/gi;
    const metas = this.html.match(metaRegex) || [];
    const allMeta = [];
    const issues = [];

    // Title analysis
    const titleMatch = this.html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    if (title) {
      allMeta.push({
        type: 'title',
        name: 'title',
        content: title,
        length: title.length
      });

      if (title.length > 60) {
        issues.push({
          type: 'title-too-long',
          element: 'title',
          message: 'タイトルが長すぎます',
          severity: 'warning',
          suggestion: '60文字以内に収めることを推奨します'
        });
      }
    } else {
      issues.push({
        type: 'missing-title',
        element: 'title',
        message: 'タイトルが設定されていません',
        severity: 'error',
        suggestion: 'ページの内容を表すタイトルを設定してください'
      });
    }

    // Meta description analysis
    const descRegex = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i;
    const descMatch = this.html.match(descRegex);
    const description = descMatch ? descMatch[1].trim() : '';

    if (description) {
      allMeta.push({
        type: 'description',
        name: 'description',
        content: description,
        length: description.length
      });

      if (description.length > 160) {
        issues.push({
          type: 'description-too-long',
          element: 'meta[name="description"]',
          message: 'meta descriptionが長すぎます',
          severity: 'warning',
          suggestion: '160文字以内に収めることを推奨します'
        });
      }
    } else {
      issues.push({
        type: 'missing-description',
        element: 'meta[name="description"]',
        message: 'meta descriptionが設定されていません',
        severity: 'warning',
        suggestion: 'ページの内容を要約したdescriptionを設定してください'
      });
    }

    // Other meta tags
    metas.forEach(meta => {
      const name = this.getAttributeValue(meta, 'name') || this.getAttributeValue(meta, 'property');
      const content = this.getAttributeValue(meta, 'content');
      
      if (name && content && name !== 'description') {
        allMeta.push({
          type: 'meta',
          name: name,
          content: content,
          length: content.length,
          property: this.getAttributeValue(meta, 'property')
        });
      }
    });

    return { allMeta, issues };
  }
}

// Enhanced web page analysis
async function analyzeWebPage(url) {
  try {
    console.log(`Fetching page: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebSiteChecker/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const parser = new SimpleHTMLParser(html);
    
    // Analyze different aspects
    const headingAnalysis = parser.analyzeHeadings();
    const imageAnalysis = parser.analyzeImages();
    const linkAnalysis = parser.analyzeLinks();
    const metaAnalysis = parser.analyzeMeta();
    
    // Calculate basic scores
    let accessibilityScore = 100;
    let seoScore = 100;
    
    // Reduce scores based on issues
    const criticalIssues = [...headingAnalysis.issues, ...imageAnalysis.issues, ...linkAnalysis.issues, ...metaAnalysis.issues];
    criticalIssues.forEach(issue => {
      if (issue.severity === 'error') {
        accessibilityScore -= 10;
        seoScore -= 5;
      } else if (issue.severity === 'warning') {
        accessibilityScore -= 5;
        seoScore -= 3;
      }
    });
    
    accessibilityScore = Math.max(0, Math.min(100, accessibilityScore));
    seoScore = Math.max(0, Math.min(100, seoScore));
    
    return {
      url,
      timestamp: new Date().toISOString(),
      scores: {
        performance: 75, // Mock score - would need real performance analysis
        accessibility: accessibilityScore,
        bestpractices: 85, // Mock score
        seo: seoScore
      },
      issues: {
        headings: headingAnalysis.issues,
        headingsStructure: headingAnalysis.headings,
        images: imageAnalysis.issues,
        allImages: imageAnalysis.allImages,
        links: linkAnalysis.issues,
        meta: metaAnalysis.issues,
        allMeta: metaAnalysis.allMeta,
        htmlStructure: [], // Could be expanded
        accessibility: {
          lighthouse: [], // Would need Lighthouse
          axe: criticalIssues.filter(issue => 
            ['missing-alt', 'empty-heading', 'empty-link-text'].includes(issue.type)
          ).map(issue => ({
            id: issue.type,
            impact: issue.severity === 'error' ? 'serious' : 'moderate',
            description: issue.message,
            help: issue.suggestion,
            nodes: 1
          }))
        },
        consoleErrors: [] // Would need browser execution
      }
    };
  } catch (error) {
    throw new Error(`Failed to analyze page: ${error.message}`);
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('API check called with:', {
      method: req.method,
      body: req.body
    });

    const { url, auth } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // URL validation
    const validationError = validateUrl(url);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    console.log(`Starting simplified page analysis for: ${url}`);
    
    // Simplified analysis without Puppeteer/Lighthouse
    const result = await analyzeWebPage(url);
    
    console.log(`Analysis completed for: ${url}`);
    res.json(result);
    
  } catch (error) {
    console.error('Error in /api/check:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack
    });
  }
}