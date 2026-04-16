'use client';

import { useEffect } from 'react';

interface TeamsCacheRefresherProps {
  shouldRefresh: boolean;
}

export default function TeamsCacheRefresher({ shouldRefresh }: TeamsCacheRefresherProps) {
  useEffect(() => {
    if (!shouldRefresh) return;
    void fetch('/api/teams/cards/refresh', {
      method: 'POST',
      keepalive: true,
    });
  }, [shouldRefresh]);

  return null;
}
