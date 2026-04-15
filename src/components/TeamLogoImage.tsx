'use client';

import type { ImgHTMLAttributes, SyntheticEvent } from 'react';

interface TeamLogoImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK_LOGO = '/team/fallback.svg';

export default function TeamLogoImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK_LOGO,
  onError,
  alt = '',
  ...props
}: TeamLogoImageProps) {
  const resolvedSrc = src && src.trim().length > 0 ? src : fallbackSrc;

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>): void => {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === 'true') return;
    img.dataset.fallbackApplied = 'true';
    img.src = fallbackSrc;
    onError?.(event);
  };

  return <img {...props} src={resolvedSrc} alt={alt} onError={handleError} />;
}
