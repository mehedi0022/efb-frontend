const normalizeExternalProductSlug = (value) => {
  if (value === null || value === undefined) return '';

  let slug = String(value).trim();
  if (!slug) return '';

  try {
    slug = decodeURIComponent(slug);
  } catch {
    // Keep original value when decodeURIComponent fails.
  }

  slug = slug.split('?')[0].split('#')[0].trim();
  if (!slug) return '';

  if (/^https?:\/\//i.test(slug)) {
    try {
      slug = new URL(slug).pathname || '';
    } catch {
      // Keep original value if URL parsing fails.
    }
  }

  slug = slug.replace(/^\/+|\/+$/g, '');
  if (!slug) return '';

  const parts = slug.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').trim();
};

const resolveExternalProductSlug = (source) => {
  const info = source?.product_info || source || {};

  const candidates = [
    info?.slug,
    source?.slug,
    info?.product_slug,
    source?.product_slug,
    info?.product_url,
    source?.product_url,
    info?.url,
    source?.url,
    info?.link,
    source?.link,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeExternalProductSlug(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '';
};

const toExternalProductPath = (slug) => {
  const normalized = normalizeExternalProductSlug(slug);
  return normalized ? `/products/external/${encodeURIComponent(normalized)}` : '/products';
};

export {
  normalizeExternalProductSlug,
  resolveExternalProductSlug,
  toExternalProductPath,
};
