import { useState } from 'react';
import type { CheckResult, CrawlResult, BasicAuth } from './types/index.js';
import { checkSinglePage, crawlSite, countPages, type PageCountResult } from './utils/api.js';
import { UrlForm } from './components/UrlForm.js';
import { Dashboard } from './components/Dashboard.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { ErrorMessage } from './components/ErrorMessage.js';
import { useErrorHandler } from './hooks/useErrorHandler.js';
import './App.css';

function App() {
  const { error, isLoading, handleAsync, clearError } = useErrorHandler();
  const [result, setResult] = useState<CheckResult | CrawlResult | null>(null);
  const [pageCountResult, setPageCountResult] = useState<PageCountResult | null>(null);
  const [pendingCrawlData, setPendingCrawlData] = useState<{startUrl: string, auth?: BasicAuth} | null>(null);
  
  // 最後の操作を記録するステート（リトライ用）
  const [lastOperation, setLastOperation] = useState<{
    type: 'singleCheck' | 'countPages' | 'directCrawl' | 'crawl';
    params: {
      url?: string | undefined;
      startUrl?: string | undefined;
      urls?: string[] | undefined;
      auth?: BasicAuth | undefined;
    };
  } | null>(null);

  const handleSingleCheck = async (url: string, auth?: BasicAuth) => {
    setResult(null);
    clearError();
    setLastOperation({ type: 'singleCheck', params: { url, auth: auth || undefined } });
    
    const checkResult = await handleAsync(() => checkSinglePage(url, auth));
    if (checkResult) {
      setResult(checkResult);
    }
  };

  const handleCountPages = async (startUrl: string, auth?: BasicAuth) => {
    setResult(null);
    setPageCountResult(null);
    clearError();
    setLastOperation({ type: 'countPages', params: { startUrl, auth: auth || undefined } });

    const countResult = await handleAsync(() => countPages(startUrl, auth));
    if (countResult) {
      setPageCountResult(countResult);
      setPendingCrawlData({ startUrl, auth: auth || undefined });
    }
  };

  const handleCrawl = async (startUrl: string, urls?: string[], auth?: BasicAuth) => {
    setResult(null);
    clearError();
    setLastOperation({ type: 'crawl', params: { startUrl, urls: urls || undefined, auth: auth || undefined } });

    const crawlResult = await handleAsync(() => crawlSite(startUrl, urls, auth));
    if (crawlResult) {
      setResult(crawlResult);
      setPageCountResult(null);
      setPendingCrawlData(null);
    }
  };

  const handleDirectCrawl = async (startUrl: string, auth?: BasicAuth) => {
    setResult(null);
    setPageCountResult(null);
    clearError();
    setLastOperation({ type: 'directCrawl', params: { startUrl, auth: auth || undefined } });

    // まずページ数を調査
    const countResult = await handleAsync(() => countPages(startUrl, auth));
    if (countResult) {
      // ページ数調査が成功したら、直接クロールを実行
      const crawlResult = await handleAsync(() => crawlSite(startUrl, countResult.urls, auth));
      if (crawlResult) {
        setResult(crawlResult);
      }
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
          onDirectCrawl={handleDirectCrawl}
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
          <ErrorMessage 
            error={error} 
            onRetry={() => {
              clearError();
              // 最後に試みた操作に応じて再試行
              if (lastOperation) {
                const { type, params } = lastOperation;
                switch (type) {
                  case 'singleCheck':
                    if (params.url) {
                      handleSingleCheck(params.url, params.auth);
                    }
                    break;
                  case 'countPages':
                    if (params.startUrl) {
                      handleCountPages(params.startUrl, params.auth);
                    }
                    break;
                  case 'directCrawl':
                    if (params.startUrl) {
                      handleDirectCrawl(params.startUrl, params.auth);
                    }
                    break;
                  case 'crawl':
                    if (params.startUrl) {
                      handleCrawl(params.startUrl, params.urls, params.auth);
                    }
                    break;
                }
              }
            }}
          />
        )}

        {isLoading && <LoadingSpinner />}

        {result && !isLoading && (
          <Dashboard 
            result={result} 
            onCheckPage={handleSingleCheck}
          />
        )}
      </main>
    </div>
  );
}

export default App;