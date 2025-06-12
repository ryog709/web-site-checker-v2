import React, { useState } from 'react';
import { Search, Globe, Lock } from 'lucide-react';
import type { BasicAuth } from '../types/index.js';

interface UrlFormProps {
  onSingleCheck: (url: string, auth?: BasicAuth) => void;
  onCrawl: (startUrl: string, maxPages: number, auth?: BasicAuth) => void;
  isLoading: boolean;
}

export const UrlForm: React.FC<UrlFormProps> = ({
  onSingleCheck,
  onCrawl,
  isLoading,
}) => {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(30);
  const [mode, setMode] = useState<'single' | 'crawl'>('single');
  const [useAuth, setUseAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      return;
    }

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    const auth = useAuth && username && password ? { username, password } : undefined;
    
    if (mode === 'single') {
      onSingleCheck(normalizedUrl, auth);
    } else {
      onCrawl(normalizedUrl, maxPages, auth);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="url-form">
      <div className="form-group">
        <label htmlFor="url-input" className="form-label">
          診断するURL
        </label>
        <div className="input-wrapper">
          <Globe className="input-icon" size={20} />
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="url-input"
            required
            disabled={isLoading}
            aria-describedby="url-help"
          />
        </div>
        <div id="url-help" className="form-help">
          診断したいWebサイトのURLを入力してください
        </div>
      </div>

      <div className="form-group">
        <fieldset className="mode-fieldset">
          <legend className="form-label">診断モード</legend>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="mode"
                value="single"
                checked={mode === 'single'}
                onChange={(e) => setMode(e.target.value as 'single' | 'crawl')}
                disabled={isLoading}
              />
              <span>単一ページ診断</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="mode"
                value="crawl"
                checked={mode === 'crawl'}
                onChange={(e) => setMode(e.target.value as 'single' | 'crawl')}
                disabled={isLoading}
              />
              <span>サイト全体診断</span>
            </label>
          </div>
        </fieldset>
      </div>

      {mode === 'crawl' && (
        <div className="form-group">
          <label htmlFor="max-pages" className="form-label">
            最大ページ数
          </label>
          <input
            id="max-pages"
            type="number"
            min="1"
            max="50"
            value={maxPages}
            onChange={(e) => setMaxPages(parseInt(e.target.value, 10) || 30)}
            className="number-input"
            disabled={isLoading}
            aria-describedby="pages-help"
          />
          <div id="pages-help" className="form-help">
            クロールする最大ページ数（1-50）
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useAuth}
            onChange={(e) => setUseAuth(e.target.checked)}
            disabled={isLoading}
          />
          <Lock className="input-icon" size={16} />
          <span>ベーシック認証を使用</span>
        </label>
      </div>

      {useAuth && (
        <div className="auth-fields">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              ユーザー名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-input"
              disabled={isLoading}
              placeholder="ユーザー名を入力"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-input"
              disabled={isLoading}
              placeholder="パスワードを入力"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        className="submit-button"
        disabled={isLoading || !url.trim()}
        aria-describedby="submit-help"
      >
        <Search className="button-icon" size={18} />
        {isLoading 
          ? (mode === 'single' ? '診断中...' : 'クロール中...') 
          : (mode === 'single' ? '診断開始' : 'クロール開始')
        }
      </button>
      <div id="submit-help" className="form-help">
        {mode === 'single' 
          ? '指定されたページのみを診断します' 
          : 'サイト全体をクロールして診断します（時間がかかる場合があります）'
        }
      </div>
    </form>
  );
};