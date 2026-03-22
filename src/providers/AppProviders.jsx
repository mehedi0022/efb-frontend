'use client';

import { useEffect } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { Provider } from 'react-redux';
import { store } from '@/store';
import AlertApiRegistrar from '@/providers/AlertApiRegistrar';

const VALID_SELECTOR_ERROR_PATTERN = /not a valid selector|failed to execute/i;
const PATCH_FLAG = '__selectorSafetyPatched';

const shouldIgnoreSelectorError = (error) => {
  const message = String(error?.message || '');
  return VALID_SELECTOR_ERROR_PATTERN.test(message);
};

const patchSelectorMethod = (prototypeObj, methodName, fallbackValue) => {
  if (!prototypeObj) return;
  const original = prototypeObj[methodName];
  if (typeof original !== 'function') return;
  if (original.__selectorSafetyWrapped) return;

  const wrapped = function wrappedSelectorMethod(...args) {
    try {
      return original.apply(this, args);
    } catch (error) {
      if (shouldIgnoreSelectorError(error)) {
        return fallbackValue;
      }
      throw error;
    }
  };

  wrapped.__selectorSafetyWrapped = true;
  wrapped.__selectorSafetyOriginal = original;
  prototypeObj[methodName] = wrapped;
};

const applySelectorSafetyPatch = () => {
  if (typeof window === 'undefined') return;
  if (window[PATCH_FLAG]) return;

  window[PATCH_FLAG] = true;
  const emptyNodeList =
    typeof document !== 'undefined'
      ? document.createDocumentFragment().querySelectorAll('*')
      : [];

  patchSelectorMethod(Document?.prototype, 'querySelector', null);
  patchSelectorMethod(Document?.prototype, 'querySelectorAll', emptyNodeList);
  patchSelectorMethod(Element?.prototype, 'querySelector', null);
  patchSelectorMethod(Element?.prototype, 'querySelectorAll', emptyNodeList);
  patchSelectorMethod(Element?.prototype, 'matches', false);
  patchSelectorMethod(Element?.prototype, 'closest', null);
};

export default function AppProviders({ children }) {
  useEffect(() => {
    applySelectorSafetyPatch();
  }, []);

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
