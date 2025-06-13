import { useState } from 'react';
import type { CheckResult, CrawlResult, BasicAuth } from './types/index.js';
import { checkSinglePage, crawlSite, countPages, ApiError, type PageCountResult } from './utils/api.js';
import { UrlForm } from './components/UrlForm.js';
import { Dashboard } from './components/Dashboard.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | CrawlResult | null>(null);
  const [error, setError] = useState<string>('');
  const [pageCountResult, setPageCountResult] = useState<PageCountResult | null>(null);
  const [pendingCrawlData, setPendingCrawlData] = useState<{startUrl: string, auth?: BasicAuth} | null>(null);

  const handleSingleCheck = async (url: string, auth?: BasicAuth) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const checkResult = await checkSinglePage(url, auth);
      setResult(checkResult);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountPages = async (startUrl: string, auth?: BasicAuth) => {
    setIsLoading(true);
    setError('');
    setResult(null);
    setPageCountResult(null);

    try {
      const countResult = await countPages(startUrl, auth);
      setPageCountResult(countResult);
      setPendingCrawlData({ startUrl, auth });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrawl = async (startUrl: string, urls?: string[], auth?: BasicAuth) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const crawlResult = await crawlSite(startUrl, urls, auth);
      setResult(crawlResult);
      setPageCountResult(null);
      setPendingCrawlData(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCrawl = () => {
    if (pendingCrawlData && pageCountResult) {
      handleCrawl(pendingCrawlData.startUrl, pageCountResult.urls, pendingCrawlData.auth);
    }
  };

  const handleCancelCrawl = () => {
    setPageCountResult(null);
    setPendingCrawlData(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Web Site Checker v2</h1>
        <p>URLを入力してサイトの品質診断を開始</p>
      </header>

      <main className="app-main">
        <UrlForm
          onSingleCheck={handleSingleCheck}
          onCrawl={handleCrawl}
          onCountPages={handleCountPages}
          isLoading={isLoading}
        />

        {pageCountResult && !isLoading && (
          <div className="page-count-confirmation">
            <div className="confirmation-card">
              <h3>📊 サイト情報</h3>
              <div className="count-info">
                <p><strong>対象サイト:</strong> {pendingCrawlData?.startUrl}</p>
                <p><strong>発見されたページ数:</strong> {pageCountResult.totalPages}ページ</p>
              </div>
              <div className="confirmation-actions">
                <button 
                  className="confirm-button" 
                  onClick={handleConfirmCrawl}
                  disabled={isLoading}
                >
                  診断を開始する
                </button>
                <button 
                  className="cancel-button" 
                  onClick={handleCancelCrawl}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            <strong>エラー:</strong> {error}
          </div>
        )}

        {isLoading && <LoadingSpinner />}

        {result && !isLoading && <Dashboard result={result} />}
      </main>
    </div>
  );
}

export default App;