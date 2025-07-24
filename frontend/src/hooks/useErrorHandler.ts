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
            let errorMessage = 'An unexpected error occurred';
            
            if (err instanceof ApiError) {
                errorMessage = err.message;
            } else if (err instanceof Error) {
                errorMessage = err.message;
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