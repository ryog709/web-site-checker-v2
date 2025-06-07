import { useState } from 'react';
import type { CheckResult, CrawlResult } from './types/index.js';
import { checkSinglePage, crawlSite, ApiError } from './utils/api.js';
import { UrlForm } from './components/UrlForm.js';
import { Dashboard } from './components/Dashboard.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | CrawlResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleSingleCheck = async (url: string) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const checkResult = await checkSinglePage(url);
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

  const handleCrawl = async (startUrl: string, maxPages: number) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const crawlResult = await crawlSite(startUrl, maxPages);
      setResult(crawlResult);
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
          isLoading={isLoading}
        />

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