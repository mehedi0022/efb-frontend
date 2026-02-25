'use client';

import dynamic from 'next/dynamic';
import PremiumLoader from '@/components/common/PremiumLoader';

const LegacyUserApp = dynamic(() => import('@/features/legacy/LegacyUserApp'), {
  ssr: false,
  loading: () => (
    <PremiumLoader
      label="Loading storefront"
      subLabel="Preparing products, offers and checkout"
    />
  ),
});

export default function UserCatchAllPage() {
  return <LegacyUserApp />;
}
