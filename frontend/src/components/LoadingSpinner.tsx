import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-container" role="status" aria-label="読み込み中">
      <div className="loading-spinner">
        <Loader2 className="spinner-icon" size={48} />
        <p className="loading-text">診断を実行中です...</p>
        <p className="loading-subtext">
          しばらくお待ちください。大きなサイトの場合、数分かかることがあります。
        </p>
      </div>
    </div>
  );
};