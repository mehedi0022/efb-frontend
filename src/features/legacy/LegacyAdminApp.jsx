'use client';

import { useEffect } from 'react';
import App from '@/legacy/admin/App';
import { useGetSettingsQuery } from '@/store/api/publicApi';
import { useAdminFetchQuery } from '@/legacy/store/adminApi';

const DEFAULT_ADMIN_BUTTON_PRIMARY = '#28c76f';
const DEFAULT_ADMIN_BUTTON_SECONDARY = '#00cfe8';

const isHexColor = (value) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '').trim());

export default function LegacyAdminApp() {
  const hasAdminSession =
    typeof window !== 'undefined' && Boolean(window.localStorage.getItem('auth_token'));

  const { data: adminSettingsResponse } = useAdminFetchQuery(
    { url: '/admin/settings', tags: ['settings', 'admin-theme'] },
    { skip: !hasAdminSession },
  );
  const { data: publicSetting } = useGetSettingsQuery(undefined, {
    skip: hasAdminSession,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const adminSetting = hasAdminSession
    ? adminSettingsResponse?.data?.[0] || null
    : publicSetting || null;

  useEffect(() => {
    document.body.classList.remove('frontend-body');
    document.body.classList.add('admin-body');

    return () => {
      document.body.classList.remove('admin-body');
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const buttonPrimary = isHexColor(adminSetting?.button_primary_color)
      ? adminSetting.button_primary_color
      : DEFAULT_ADMIN_BUTTON_PRIMARY;
    const buttonSecondary = isHexColor(adminSetting?.button_secondary_color)
      ? adminSetting.button_secondary_color
      : DEFAULT_ADMIN_BUTTON_SECONDARY;

    root.style.setProperty('--admin-btn-primary', buttonPrimary);
    root.style.setProperty('--admin-btn-secondary', buttonSecondary);
    root.style.setProperty('--admin-btn-text', '#ffffff');
  }, [adminSetting?.button_primary_color, adminSetting?.button_secondary_color]);

  return <App />;
}
