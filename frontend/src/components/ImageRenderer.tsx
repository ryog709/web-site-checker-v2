import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getProxiedImageUrl, isValidImageUrl } from '../utils/imageUtils.js';
import type { BasicAuth } from '../types/index.js';

interface ImageRendererProps {
    src: string;
    alt: string;
    className?: string;
    auth?: BasicAuth;
    fallbackText?: string;
    size?: 'small' | 'medium' | 'large';
}

/**
 * 画像の読み込みとフォールバック処理を統一するコンポーネント
 */
export const ImageRenderer: React.FC<ImageRendererProps> = ({
    src,
    alt,
    className = '',
    auth,
    fallbackText = '画像を読み込めません',
    size = 'medium'
}) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
        if (fallback) {
            fallback.style.display = 'flex';
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { iconSize: 16 };
            case 'medium':
                return { iconSize: 24 };
            case 'large':
                return { iconSize: 32 };
            default:
                return { iconSize: 24 };
        }
    };

    const { iconSize } = getSizeStyles();
    const fallbackClassName = `image-fallback image-fallback--${size} ${className}`;

    if (!isValidImageUrl(src)) {
        return (
            <div className={fallbackClassName}>
                <ImageIcon size={iconSize} />
                <span>{fallbackText}</span>
            </div>
        );
    }

    return (
        <>
            <img 
                src={getProxiedImageUrl(src, auth)} 
                alt={alt}
                className={className}
                onError={handleImageError}
            />
            <div className={fallbackClassName} style={{ display: 'none' }}>
                <ImageIcon size={iconSize} />
                <span>{fallbackText}</span>
            </div>
        </>
    );
};

/**
 * 見出し内画像用の水平レイアウト版
 */
export const ImageRendererHorizontal: React.FC<ImageRendererProps> = (props) => {
    return (
        <div className="image-container-horizontal">
            <ImageRenderer
                {...props}
                className="preview-image-horizontal"
                size="small"
            />
        </div>
    );
};

/**
 * 全画像表示用のフルサイズ版
 */
export const ImageRendererFull: React.FC<ImageRendererProps> = (props) => {
    return (
        <ImageRenderer
            {...props}
            className="image-preview-full"
            size="large"
        />
    );
};

/**
 * 問題表示用の画像プレビュー版
 */
export const ImageRendererIssue: React.FC<ImageRendererProps> = (props) => {
    return (
        <ImageRenderer
            {...props}
            className="issue-preview-image"
            size="large"
            fallbackText="画像を読み込めません"
        />
    );
};