import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const normalizeRequestArgs = (args) => {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return args;
  }

  const method = String(args.method || 'GET').toUpperCase();
  const body = args.body;
  const canOverrideMethod =
    typeof FormData !== 'undefined' &&
    body instanceof FormData &&
    !['GET', 'POST', 'HEAD'].includes(method);

  if (!canOverrideMethod) {
    return args;
  }

  const formData = new FormData();
  body.forEach((value, key) => {
    formData.append(key, value);
  });

  if (!formData.has('_method')) {
    formData.append('_method', method);
  }

  return {
    ...args,
    method: 'POST',
    body: formData
  };
};

export const createReauthBaseQuery = ({
  baseUrl,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  setTokens,
  refreshUrl,
  onUnauthorized,
  attachExtraHeaders
}) => {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json');
      const token = getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (typeof attachExtraHeaders === 'function') {
        attachExtraHeaders(headers);
      }
      return headers;
    }
  });

  return async (args, api, extraOptions) => {
    const normalizedArgs = normalizeRequestArgs(args);
    let result = await rawBaseQuery(normalizedArgs, api, extraOptions);

    if (result?.error?.status === 401) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        if (typeof onUnauthorized === 'function') onUnauthorized();
        return result;
      }

      const refreshResult = await rawBaseQuery(
        {
          url: refreshUrl,
          method: 'POST',
          body: { refresh_token: refreshToken }
        },
        api,
        extraOptions
      );

      const tokenFromRefresh = refreshResult?.data?.token || refreshResult?.data?.access_token;
      const refreshFromRefresh = refreshResult?.data?.refresh_token;

      if (tokenFromRefresh) {
        setTokens({ accessToken: tokenFromRefresh, refreshToken: refreshFromRefresh || refreshToken });
        result = await rawBaseQuery(normalizedArgs, api, extraOptions);
      } else {
        clearTokens();
        if (typeof onUnauthorized === 'function') onUnauthorized();
      }
    }

    return result;
  };
};
