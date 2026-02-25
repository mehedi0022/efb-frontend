'use client';

import { useEffect } from 'react';
import App from '@/legacy/admin/App';

export default function LegacyAdminApp() {
  useEffect(() => {
    document.body.classList.remove('frontend-body');
  }, []);

  return <App />;
}
