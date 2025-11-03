/**
 * Legacy Result Mapper テスト
 * 
 * ダミーデータでマッピング動作を確認
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mapPipelineResultToLegacy,
  mapLighthouseScores,
  mapIssuesBundle,
  mapSiteLinks,
  mapSemanticAnalysis
} from '../src/services/pipeline/core/legacyResultMapper.js';

describe('legacyResultMapper', () => {
  describe('mapPipelineResultToLegacy', () => {
    it('should convert full pipeline result to legacy format', () => {
      const pipelineResult = {
        context: {
          url: 'https://example.com',
          auth: null
        },
        lighthouse: {
          categories: {
            performance: { score: 0.85 },
            accessibility: { score: 0.92 },
            'best-practices': { score: 0.88 },
            seo: { score: 0.95 }
          },
          accessibilityIssues: []
        },
        dom: {
          headingIssues: [],
          headingStructure: [],
          imageIssues: [],
          imageDetails: [],
          linkIssues: [],
          metaIssues: [],
          metaDetails: [],
          htmlStructureIssues: [],
          links: [
            { url: 'https://example.com/page1', text: 'Page 1', title: 'Title 1' },
            { url: 'https://example.com/page2', text: 'Page 2', title: 'Title 2' }
          ]
        },
        axe: {
          violations: []
        },
        gemini: {
          geminiAnalysis: {
            contentQuality: {
              score: 85,
              improvements: ['Improvement 1'],
              details: 'Details'
            }
          },
          processingTime: 1500,
          cached: false
        },
        browser: {
          consoleErrors: []
        }
      };

      const result = mapPipelineResultToLegacy(pipelineResult);

      assert.strictEqual(result.url, 'https://example.com');
      assert.ok(result.timestamp);
      assert.strictEqual(result.scores.performance, 85);
      assert.strictEqual(result.scores.accessibility, 92);
      assert.strictEqual(result.scores.bestpractices, 88);
      assert.strictEqual(result.scores.seo, 95);
      assert.ok(result.issues);
      assert.strictEqual(result.siteLinks.length, 2);
      assert.ok(result.semanticAnalysis.geminiAnalysis);
      assert.strictEqual(result.auth, null);
    });

    it('should handle missing optional fields', () => {
      const pipelineResult = {
        context: {
          url: 'https://example.com',
          auth: null
        },
        lighthouse: null,
        dom: null,
        axe: null,
        gemini: null,
        browser: null
      };

      const result = mapPipelineResultToLegacy(pipelineResult);

      assert.strictEqual(result.url, 'https://example.com');
      assert.strictEqual(result.scores.performance, 75); // fallback
      assert.strictEqual(result.issues.headings.length, 0);
      assert.strictEqual(result.siteLinks.length, 0);
      assert.ok(result.semanticAnalysis.error);
    });
  });

  describe('mapLighthouseScores', () => {
    it('should map Lighthouse scores correctly', () => {
      const lighthouseResult = {
        categories: {
          performance: { score: 0.85 },
          accessibility: { score: 0.92 },
          'best-practices': { score: 0.88 },
          seo: { score: 0.95 }
        }
      };

      const scores = mapLighthouseScores(lighthouseResult, null);

      assert.strictEqual(scores.performance, 85);
      assert.strictEqual(scores.accessibility, 92);
      assert.strictEqual(scores.bestpractices, 88);
      assert.strictEqual(scores.seo, 95);
    });

    it('should use fallback when Lighthouse result is null', () => {
      const scores = mapLighthouseScores(null, null);

      assert.strictEqual(scores.performance, 75);
      assert.strictEqual(scores.accessibility, 70);
      assert.strictEqual(scores.bestpractices, 75);
      assert.strictEqual(scores.seo, 70);
    });
  });

  describe('mapIssuesBundle', () => {
    it('should map all issue categories', () => {
      const pipelineResult = {
        dom: {
          headingIssues: [{ type: 'missing-h1' }],
          headingStructure: [],
          imageIssues: [],
          imageDetails: [],
          linkIssues: [],
          metaIssues: [],
          metaDetails: [],
          htmlStructureIssues: []
        },
        lighthouse: {
          accessibilityIssues: []
        },
        axe: {
          violations: [{ id: 'color-contrast', impact: 'serious' }]
        },
        browser: {
          consoleErrors: []
        }
      };

      const issues = mapIssuesBundle(pipelineResult);

      assert.strictEqual(issues.headings.length, 1);
      assert.strictEqual(issues.accessibility.axe.length, 1);
      assert.strictEqual(issues.accessibility.axe[0].id, 'color-contrast');
    });

    it('should handle empty results', () => {
      const pipelineResult = {
        dom: null,
        lighthouse: null,
        axe: null,
        browser: null
      };

      const issues = mapIssuesBundle(pipelineResult);

      assert.strictEqual(issues.headings.length, 0);
      assert.strictEqual(issues.accessibility.lighthouse.length, 0);
      assert.strictEqual(issues.accessibility.axe.length, 0);
      assert.strictEqual(issues.consoleErrors.length, 0);
    });
  });

  describe('mapSiteLinks', () => {
    it('should filter same domain links', () => {
      const links = [
        { url: 'https://example.com/page1', text: 'Page 1', title: 'Title 1' },
        { url: 'https://other.com/page2', text: 'Page 2', title: 'Title 2' },
        { url: 'https://example.com/page3', text: 'Page 3', title: 'Title 3' }
      ];

      const siteLinks = mapSiteLinks(links, 'https://example.com');

      assert.strictEqual(siteLinks.length, 2);
      assert.strictEqual(siteLinks[0].url, 'https://example.com/page1');
      assert.strictEqual(siteLinks[1].url, 'https://example.com/page3');
    });

    it('should exclude WordPress special URLs', () => {
      const links = [
        { url: 'https://example.com/page1', text: 'Page 1', title: 'Title 1' },
        { url: 'https://example.com/feed/', text: 'Feed', title: 'Feed' },
        { url: 'https://example.com/comments/', text: 'Comments', title: 'Comments' }
      ];

      const siteLinks = mapSiteLinks(links, 'https://example.com');

      assert.strictEqual(siteLinks.length, 1);
      assert.strictEqual(siteLinks[0].url, 'https://example.com/page1');
    });

    it('should limit to 20 links', () => {
      const links = Array.from({ length: 30 }, (_, i) => ({
        url: `https://example.com/page${i}`,
        text: `Page ${i}`,
        title: `Title ${i}`
      }));

      const siteLinks = mapSiteLinks(links, 'https://example.com');

      assert.strictEqual(siteLinks.length, 20);
    });

    it('should truncate text and title to 100 characters', () => {
      const longText = 'a'.repeat(150);
      const links = [
        { url: 'https://example.com/page1', text: longText, title: longText }
      ];

      const siteLinks = mapSiteLinks(links, 'https://example.com');

      assert.strictEqual(siteLinks[0].text.length, 100);
      assert.strictEqual(siteLinks[0].title.length, 100);
    });
  });

  describe('mapSemanticAnalysis', () => {
    it('should map successful Gemini result', () => {
      const geminiResult = {
        geminiAnalysis: {
          contentQuality: {
            score: 85,
            improvements: ['Improvement 1'],
            details: 'Details'
          }
        },
        processingTime: 1500,
        cached: false
      };

      const result = mapSemanticAnalysis(geminiResult);

      assert.strictEqual(result.isEnabled, true);
      assert.ok(result.geminiAnalysis);
      assert.strictEqual(result.processingTime, 1500);
      assert.strictEqual(result.cached, false);
    });

    it('should handle Gemini error', () => {
      const geminiResult = {
        error: 'API quota exceeded',
        errorCode: 'QUOTA_EXCEEDED'
      };

      const result = mapSemanticAnalysis(geminiResult);

      assert.strictEqual(result.isEnabled, true);
      assert.strictEqual(result.error, 'API quota exceeded');
      assert.strictEqual(result.errorCode, 'QUOTA_EXCEEDED');
    });

    it('should handle null Gemini result', () => {
      const result = mapSemanticAnalysis(null);

      assert.strictEqual(result.isEnabled, true);
      assert.strictEqual(result.error, 'Gemini analysis failed');
      assert.strictEqual(result.errorCode, 'UNKNOWN_ERROR');
    });
  });
});