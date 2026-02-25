'use client';

import dynamic from 'next/dynamic';
import PremiumLoader from '@/components/common/PremiumLoader';

const LegacyAdminApp = dynamic(() => import('@/features/legacy/LegacyAdminApp'), {
  ssr: false,
  loading: () => (
    <PremiumLoader
      variant="admin"
      label="Loading admin panel"
      subLabel="Setting up dashboard modules"
    />
  ),
});

export default function AdminCatchAllPage() {
  return <LegacyAdminApp />;
}
