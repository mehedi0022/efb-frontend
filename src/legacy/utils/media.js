const trimTrailingSlash = (value = '') => String(value).replace(/\/+$/, '');

const isAbsoluteUrl = (value) => /^(https?:)?\/\//i.test(value);
const isInlineUrl = (value) => /^(data:|blob:)/i.test(value);

const API_BASE_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL || '');
const EXTERNAL_IMAGE_BASE = trimTrailingSlash(process.env.NEXT_PUBLIC_EXTERNAL_IMAGE_BASE || '');

export const resolveMediaUrl = (path, fallback = null) => {
  if (!path) return fallback;

  const value = String(path).trim();
  if (!value) return fallback;
  if (isInlineUrl(value) || isAbsoluteUrl(value)) return value;

  const normalized = value.replace(/^\/+/, '');
  if (!normalized) return fallback;

  if (normalized.startsWith('frontEnd/')) {
    return `/${normalized}`;
  }

  if (normalized.startsWith('uploads/') && API_BASE_URL) {
    return `${API_BASE_URL}/${normalized}`;
  }

  if (EXTERNAL_IMAGE_BASE) {
    return `${EXTERNAL_IMAGE_BASE}/${normalized}`;
  }

  if (API_BASE_URL) {
    return `${API_BASE_URL}/${normalized}`;
  }

  return `/${normalized}`;
};
