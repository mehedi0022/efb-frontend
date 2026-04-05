'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/pixel';

export function usePixel() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef(null);

  useEffect(() => {
    if (typeof pathname !== 'string') return;

    // The global base snippet already fires the first PageView.
    if (lastTrackedPathRef.current === null) {
      lastTrackedPathRef.current = pathname;
      return;
    }

    if (lastTrackedPathRef.current === pathname) return;

    lastTrackedPathRef.current = pathname;
    trackPageView();
  }, [pathname]);
}

export default function PixelPageTracker() {
  usePixel();
  return null;
}
