import React from 'react';

export type SignatureSize = 'sm' | 'md' | 'lg' | 'xl';

export interface DocumentSignatureImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
    alt?: string;
    size?: SignatureSize;
    inline?: boolean;
    className?: string;
}

/**
 * Normalizes signature file paths so relative storage paths are resolved to `/storage/...`.
 */
export function normalizeSignatureUrl(path?: string | null): string | null {
    if (!path) return null;
    const trimmed = String(path).trim();
    if (!trimmed) return null;
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('/')
    ) {
        return trimmed;
    }
    return `/storage/${trimmed}`;
}

const SIZE_CLASSES: Record<SignatureSize, string> = {
    sm: 'h-9 max-h-9 max-w-[130px]',
    md: 'h-12 max-h-12 max-w-[160px]',
    lg: 'h-14 max-h-14 max-w-[180px]',
    xl: 'h-16 max-h-16 max-w-[200px]',
};

/**
 * Shared component for rendering digital signatures across all forms & documents.
 * Updating sizes here will automatically adjust signatures across the entire system.
 */
export function DocumentSignatureImage({
    src,
    alt = 'Signature',
    size = 'md',
    inline = false,
    className = '',
    ...props
}: DocumentSignatureImageProps) {
    const resolvedUrl = normalizeSignatureUrl(src);
    if (!resolvedUrl) return null;

    const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
    const displayClass = inline ? 'inline-block align-middle' : 'block';

    return (
        <img
            src={resolvedUrl}
            alt={alt}
            className={`${sizeClass} ${displayClass} object-contain ${className}`.trim()}
            {...props}
        />
    );
}

export default DocumentSignatureImage;
