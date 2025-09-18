import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, Clock, Server } from 'lucide-react';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => {
  // エラーメッセージに基づいてアイコンとアドバイスを決定
  const getErrorDetails = (errorMessage: string) => {
    if (errorMessage.includes('ネットワーク') || errorMessage.includes('接続')) {
      return {
        icon: <WifiOff className="w-6 h-6" />,
        title: 'ネットワークエラー',
        advice: '・インターネット接続を確認してください\n・バックエンドサーバーが起動しているか確認してください（npm run dev）\n・ポート4000が使用可能か確認してください',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-600'
      };
    }
    
    if (errorMessage.includes('タイムアウト')) {
      return {
        icon: <Clock className="w-6 h-6" />,
        title: 'タイムアウトエラー',
        advice: '・ページの読み込みに時間がかかっています\n・しばらく待ってから再試行してください\n・大きなサイトの場合は、単一ページチェックを試してください',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-600'
      };
    }
    
    if (errorMessage.includes('サーバー')) {
      return {
        icon: <Server className="w-6 h-6" />,
        title: 'サーバーエラー',
        advice: '・サーバーで問題が発生しています\n・しばらく待ってから再試行してください\n・問題が続く場合は、サーバーログを確認してください',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600'
      };
    }
    
    if (errorMessage.includes('URL') || errorMessage.includes('入力')) {
      return {
        icon: <AlertCircle className="w-6 h-6" />,
        title: '入力エラー',
        advice: '・URLの形式を確認してください\n・http:// または https:// で始まっているか確認してください\n・URLに誤字脱字がないか確認してください',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600'
      };
    }
    
    // デフォルト
    return {
      icon: <AlertCircle className="w-6 h-6" />,
      title: 'エラー',
      advice: '・もう一度お試しください\n・問題が続く場合は、ページをリロードしてください',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-600'
    };
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className={`rounded-lg border-2 ${errorDetails.borderColor} ${errorDetails.bgColor} p-6 mb-6`}>
      <div className="flex items-start space-x-4">
        <div className={`${errorDetails.iconColor} flex-shrink-0 mt-1`}>
          {errorDetails.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {errorDetails.title}
          </h3>
          <p className="text-gray-700 mb-3">
            {error}
          </p>
          <div className="bg-white bg-opacity-70 rounded-md p-3 mb-4">
            <p className="text-sm font-medium text-gray-600 mb-1">解決方法：</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {errorDetails.advice}
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`inline-flex items-center px-4 py-2 rounded-md text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              もう一度試す
            </button>
          )}
        </div>
      </div>
    </div>
  );
};