'use client';

import { createApi } from '@reduxjs/toolkit/query/react';
import { buildApiUrl } from '@/config/env';
import { tokenStorage } from '@/lib/auth/tokens';
import { createReauthBaseQuery } from './createReauthBaseQuery';
import { showSuccessMessage } from '@/legacy/admin/utils/alerts';

const isBrowser = typeof window !== 'undefined';

const redirectToLogin = () => {
  if (!isBrowser) return;
  window.localStorage.removeItem('user');
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login';
  }
};

const baseQuery = createReauthBaseQuery({
  baseUrl: buildApiUrl('/api'),
  getAccessToken: tokenStorage.getAdminAccessToken,
  getRefreshToken: tokenStorage.getAdminRefreshToken,
  setTokens: tokenStorage.setAdminTokens,
  clearTokens: tokenStorage.clearAdminTokens,
  refreshUrl: '/admin/refresh-token',
  onUnauthorized: redirectToLogin
});

const normalizeTags = (tags) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return [{ type: 'Admin', id: 'LIST' }];
  }
  return tags.map((tag) => ({ type: 'Admin', id: tag }));
};

const SUCCESS_FALLBACK_BY_METHOD = {
  POST: 'Saved successfully.',
  PUT: 'Updated successfully.',
  PATCH: 'Updated successfully.',
  DELETE: 'Deleted successfully.'
};

const resolveSuccessMessage = ({ method, responseData, successMessage }) => {
  if (typeof successMessage === 'string' && successMessage.trim()) {
    return successMessage.trim();
  }

  if (responseData && typeof responseData === 'object') {
    const apiMessage = responseData.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage.trim();
    }
  }

  return SUCCESS_FALLBACK_BY_METHOD[method] || '';
};

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery,
  tagTypes: ['Admin'],
  endpoints: (builder) => ({
    adminLogin: builder.mutation({
      query: (payload) => ({
        url: '/admin/login',
        method: 'POST',
        body: payload
      })
    }),
    adminRefreshToken: builder.mutation({
      query: (payload) => ({
        url: '/admin/refresh-token',
        method: 'POST',
        body: payload
      })
    }),
    adminFetch: builder.query({
      queryFn: async (arg, api, extraOptions, baseQueryFn) => {
        const { url, params } = arg || {};
        return baseQueryFn({ url, params });
      },
      providesTags: (result, error, arg) => normalizeTags(arg?.tags)
    }),
    adminAction: builder.mutation({
      queryFn: async (arg, api, extraOptions, baseQueryFn) => {
        const {
          url,
          method = 'POST',
          body,
          params,
          notifySuccess,
          successMessage
        } = arg || {};

        const normalizedMethod = String(method || 'POST').toUpperCase();
        const result = await baseQueryFn({
          url,
          method: normalizedMethod,
          body,
          params
        });

        if (!result?.error) {
          const shouldNotifyByDefault = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod);
          const shouldNotify =
            typeof notifySuccess === 'boolean' ? notifySuccess : shouldNotifyByDefault;

          if (shouldNotify) {
            const messageText = resolveSuccessMessage({
              method: normalizedMethod,
              responseData: result?.data,
              successMessage
            });

            if (messageText) {
              showSuccessMessage(messageText);
            }
          }
        }

        return result;
      },
      invalidatesTags: (result, error, arg) => normalizeTags(arg?.invalidates)
    })
  })
});

export const {
  useAdminLoginMutation,
  useAdminRefreshTokenMutation,
  useAdminFetchQuery,
  useLazyAdminFetchQuery,
  useAdminActionMutation
} = adminApi;
