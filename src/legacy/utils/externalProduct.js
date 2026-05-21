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

const toPositiveInt = (value) => {
  if (!Number.isFinite(Number(value))) return null;
  const num = Number(value);
  return num > 0 ? Math.trunc(num) : null;
};

const resolvePanelOrderMeta = (source) => {
  const info = source?.product_info || source || {};
  return {
    panelProductId: toPositiveInt(
      info?.panel_product_id ??
        source?.panel_product_id ??
        info?.product_id ??
        source?.product_id ??
        info?.id ??
        source?.id
    ),
    panelVariantId: toPositiveInt(
      info?.panel_variant_id ??
        source?.panel_variant_id ??
        info?.variant_id ??
        source?.variant_id ??
        info?.default_variant_id ??
        source?.default_variant_id
    ),
    panelSellerProductId: toPositiveInt(
      info?.panel_seller_product_id ??
        source?.panel_seller_product_id ??
        info?.seller_product_id ??
        source?.seller_product_id
    ),
  };
};

export {
  normalizeExternalProductSlug,
  resolveExternalProductSlug,
  toExternalProductPath,
  resolvePanelOrderMeta,
};
