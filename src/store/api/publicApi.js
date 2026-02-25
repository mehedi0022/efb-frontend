'use client';

import { createApi } from '@reduxjs/toolkit/query/react';
import { buildApiUrl } from '@/config/env';
import { tokenStorage } from '@/lib/auth/tokens';
import { createReauthBaseQuery } from './createReauthBaseQuery';

const isBrowser = typeof window !== 'undefined';
const BLOCKED_PAGE_PATH = '/blocked';

const resolveBlockedPayload = (result) => {
  const errorStatus = result?.error?.status;
  if (errorStatus !== 403) {
    return null;
  }

  const payload = result?.error?.data;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const code = String(payload.code || '').trim().toLowerCase();
  const blockedFlag = payload.blocked === true;
  const message = String(payload.message || '').toLowerCase();
  const looksLikeBlockMessage = message.includes('restricted') && message.includes('access');

  if (!(code === 'ip_blocked' || blockedFlag || looksLikeBlockMessage)) {
    return null;
  }

  return {
    reason: typeof payload.reason === 'string' ? payload.reason.trim() : '',
    ip: typeof payload.ip === 'string' ? payload.ip.trim() : '',
  };
};

const redirectToBlockedPage = (blockedPayload) => {
  if (!isBrowser) return;
  if (window.location.pathname === BLOCKED_PAGE_PATH) return;

  const params = new URLSearchParams();
  if (blockedPayload?.reason) {
    params.set('reason', blockedPayload.reason);
  }
  if (blockedPayload?.ip) {
    params.set('ip', blockedPayload.ip);
  }

  const queryString = params.toString();
  const destination = queryString ? `${BLOCKED_PAGE_PATH}?${queryString}` : BLOCKED_PAGE_PATH;
  window.location.replace(destination);
};

const rawBaseQuery = createReauthBaseQuery({
  baseUrl: buildApiUrl('/api/v1'),
  getAccessToken: tokenStorage.getCustomerAccessToken,
  getRefreshToken: tokenStorage.getCustomerRefreshToken,
  setTokens: tokenStorage.setCustomerTokens,
  clearTokens: tokenStorage.clearCustomerTokens,
  refreshUrl: '/refresh-token',
  attachExtraHeaders: (headers) => {
    if (!isBrowser) return;
    const cartId = window.localStorage.getItem('cart_id');
    if (cartId) {
      headers.set('X-Cart-ID', cartId);
    }
  }
});

const baseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  const blockedPayload = resolveBlockedPayload(result);

  if (blockedPayload) {
    redirectToBlockedPage(blockedPayload);
  }

  if (isBrowser && result?.data?.cart_id) {
    window.localStorage.setItem('cart_id', result.data.cart_id);
  }

  return result;
};

export const publicApi = createApi({
  reducerPath: 'publicApi',
  baseQuery,
  tagTypes: ['Cart', 'Settings', 'SiteData', 'User', 'Products', 'Pages', 'External'],
  endpoints: (builder) => ({
    getSettings: builder.query({
      query: () => '/settings',
      transformResponse: (response) => response?.data ?? null,
      providesTags: ['Settings']
    }),
    getSiteData: builder.query({
      query: () => '/site-data',
      transformResponse: (response) => response?.data ?? null,
      providesTags: ['SiteData']
    }),
    getProducts: builder.query({
      query: (params) => ({ url: '/products', params }),
      providesTags: ['Products']
    }),
    getBanners: builder.query({
      query: (params) => ({ url: '/banners', params }),
      providesTags: ['SiteData']
    }),
    getProductBySlug: builder.query({
      query: (slug) => `/products/${slug}`,
      providesTags: ['Products']
    }),
    getPageBySlug: builder.query({
      query: (slug) => `/pages/${slug}`,
      providesTags: ['Pages']
    }),
    getCart: builder.query({
      query: () => '/cart',
      transformResponse: (response) => response?.data ?? null,
      providesTags: ['Cart']
    }),
    updateCartItem: builder.mutation({
      query: ({ id, quantity }) => ({
        url: `/cart/items/${id}`,
        method: 'PUT',
        body: { quantity }
      }),
      invalidatesTags: ['Cart']
    }),
    deleteCartItem: builder.mutation({
      query: (id) => ({
        url: `/cart/items/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Cart']
    }),
    addToCart: builder.mutation({
      query: (payload) => ({
        url: '/cart/add',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Cart']
    }),
    addExternalToCart: builder.mutation({
      query: (payload) => ({
        url: '/cart/external/add',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Cart']
    }),
    getShippingCharges: builder.query({
      query: () => '/shipping-charges'
    }),
    checkout: builder.mutation({
      query: (payload) => ({
        url: '/checkout',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Cart']
    }),
    trackIncompleteOrder: builder.mutation({
      query: (payload) => ({
        url: '/incomplete-orders/track',
        method: 'POST',
        body: payload
      })
    }),
    getUser: builder.query({
      query: () => '/user',
      providesTags: ['User']
    }),
    login: builder.mutation({
      query: ({ phone, password }) => ({
        url: '/login',
        method: 'POST',
        body: { phone, password }
      })
    }),
    register: builder.mutation({
      query: (payload) => ({
        url: '/register',
        method: 'POST',
        body: payload
      })
    }),
    refreshToken: builder.mutation({
      query: (payload) => ({
        url: '/refresh-token',
        method: 'POST',
        body: payload
      })
    }),
    logout: builder.mutation({
      query: (payload) => ({
        url: '/logout',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['User', 'Cart']
    }),
    getExternalProduct: builder.query({
      query: (slug) => `/external/product/${slug}`,
      providesTags: ['External']
    }),
    getExternalFeaturedCategories: builder.query({
      query: (params) => ({ url: '/external/featured-categories', params }),
      providesTags: ['External']
    }),
    getExternalMenuCategories: builder.query({
      query: (params) => ({ url: '/external/menu-categories', params }),
      providesTags: ['External']
    }),
    getExternalTopSell: builder.query({
      query: (params) => ({ url: '/external/top-sell', params }),
      providesTags: ['External']
    }),
    getExternalHotDeals: builder.query({
      query: (params) => ({ url: '/external/hot-deals', params }),
      providesTags: ['External']
    }),
    getNewArrivals: builder.query({
      query: (params) => ({ url: '/products/new-arrivals', params }),
      providesTags: ['Products']
    }),
    getExternalCategoryProducts: builder.query({
      query: (params) => ({ url: '/external/category-products', params }),
      providesTags: ['External']
    }),
    getExternalCategoryBySlug: builder.query({
      query: ({ slug, ...params }) => ({ url: `/external/category/${slug}`, params }),
      providesTags: ['External']
    }),
    getExternalSearch: builder.query({
      query: (params) => ({ url: '/external/search', params }),
      providesTags: ['External']
    }),
    getHomeCategories: builder.query({
      query: () => '/home-categories',
      providesTags: ['Products']
    })
  })
});

export const {
  useGetSettingsQuery,
  useGetSiteDataQuery,
  useGetProductsQuery,
  useGetBannersQuery,
  useGetProductBySlugQuery,
  useGetPageBySlugQuery,
  useGetCartQuery,
  useUpdateCartItemMutation,
  useDeleteCartItemMutation,
  useAddToCartMutation,
  useAddExternalToCartMutation,
  useGetShippingChargesQuery,
  useCheckoutMutation,
  useTrackIncompleteOrderMutation,
  useGetUserQuery,
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useGetExternalProductQuery,
  useGetExternalFeaturedCategoriesQuery,
  useGetExternalMenuCategoriesQuery,
  useGetExternalTopSellQuery,
  useGetExternalHotDealsQuery,
  useGetNewArrivalsQuery,
  useGetExternalCategoryProductsQuery,
  useGetExternalCategoryBySlugQuery,
  useGetExternalSearchQuery,
  useGetHomeCategoriesQuery
} = publicApi;
