import { useState, useCallback } from 'react';
import { ApiError } from '../utils/api.js';

interface ErrorState {
    error: string;
    isLoading: boolean;
}

interface UseErrorHandlerReturn {
    error: string;
    isLoading: boolean;
    clearError: () => void;
    handleAsync: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

/**
 * 非同期処理のエラーハンドリングを統一するカスタムフック
 */
export function useErrorHandler(): UseErrorHandlerReturn {
    const [state, setState] = useState<ErrorState>({
        error: '',
        isLoading: false
    });

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: '' }));
    }, []);

    const handleAsync = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
        setState(prev => ({ ...prev, isLoading: true, error: '' }));
        
        try {
            const result = await asyncFn();
            setState(prev => ({ ...prev, isLoading: false }));
            return result;
        } catch (err) {
            let errorMessage = '予期しないエラーが発生しました';
            
            if (err instanceof ApiError) {
                // バックエンドからのエラーメッセージをそのまま使用（既に日本語化済み）
                errorMessage = err.message;
            } else if (err instanceof Error) {
                // ネットワークエラーなどの場合は日本語化
                const errorTranslations: Record<string, string> = {
                    'Network error': 'ネットワークエラーが発生しました',
                    'Failed to fetch': 'サーバーへの接続に失敗しました',
                    'Network error or server unavailable': 'ネットワークエラーまたはサーバーが利用できません',
                    'timeout': 'タイムアウトしました'
                };
                
                // エラーメッセージの翻訳を試みる
                for (const [key, translation] of Object.entries(errorTranslations)) {
                    if (err.message.toLowerCase().includes(key.toLowerCase())) {
                        errorMessage = translation;
                        break;
                    }
                }
                
                // 翻訳が見つからない場合は元のメッセージを使用
                if (errorMessage === '予期しないエラーが発生しました' && err.message) {
                    errorMessage = err.message;
                }
            }
            
            setState({ isLoading: false, error: errorMessage });
            return null;
        }
    }, []);

    return {
        error: state.error,
        isLoading: state.isLoading,
        clearError,
        handleAsync
    };
}