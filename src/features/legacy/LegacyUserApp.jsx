'use client';

import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import router from '@/legacy/router';
import { AuthProvider } from '@/legacy/context/AuthContext';
import { SettingsProvider } from '@/legacy/context/SettingsContext';
import { SiteDataProvider } from '@/legacy/context/SiteDataContext';
import { CartProvider } from '@/legacy/context/CartContext';
import PixelCodeInjector from '@/legacy/components/PixelCodeInjector';

export default function LegacyUserApp() {
  const isBlockedRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/blocked');

  useEffect(() => {
    document.body.classList.add('frontend-body');
    return () => {
      document.body.classList.remove('frontend-body');
    };
  }, []);

  if (isBlockedRoute) {
    return <RouterProvider router={router} />;
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <SiteDataProvider>
          <PixelCodeInjector />
          <CartProvider>
            <RouterProvider router={router} />
          </CartProvider>
        </SiteDataProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
