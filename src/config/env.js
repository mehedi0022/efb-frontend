const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const env = {
  apiBaseUrl: rawApiBaseUrl.replace(/\/$/, ''),
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Naxt Ecommerce',
  externalImageBase:
    process.env.NEXT_PUBLIC_EXTERNAL_IMAGE_BASE || 'https://freelancerbangladesh.com/',
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '01700-000000',
  bkashPhone: process.env.NEXT_PUBLIC_BKASH_PHONE || '01800-000000',
  nogodPhone: process.env.NEXT_PUBLIC_NOGOD_PHONE || '01900-000000',
  messengerUrl: process.env.NEXT_PUBLIC_MESSENGER_URL || '#',
  loginTitle: process.env.NEXT_PUBLIC_LOGIN_PAGE_TITLE || process.env.NEXT_PUBLIC_APP_NAME || 'Ecommerce'
};

export const buildApiUrl = (path) => `${env.apiBaseUrl}${path}`;
