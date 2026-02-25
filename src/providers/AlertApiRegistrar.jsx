'use client';

import { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { setAlertApis } from '@/legacy/admin/utils/alerts';

export default function AlertApiRegistrar() {
  const { message, modal } = AntdApp.useApp();

  useEffect(() => {
    setAlertApis({ messageApi: message, modalApi: modal });
  }, [message, modal]);

  return null;
}
