'use client';

import { App as AntdApp, ConfigProvider } from 'antd';
import { Provider } from 'react-redux';
import { store } from '@/store';
import AlertApiRegistrar from '@/providers/AlertApiRegistrar';

export default function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#10b981',
            borderRadius: 8,
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        }}
      >
        <AntdApp>
          <AlertApiRegistrar />
          {children}
        </AntdApp>
      </ConfigProvider>
    </Provider>
  );
}
