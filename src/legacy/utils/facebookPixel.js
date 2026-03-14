const FB_EVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';
const PAGE_VIEW_DEDUPE_WINDOW_MS = 600;
const GLOBAL_STATE_KEY = '__legacyFacebookPixelState';
const SIMPLE_PIXEL_ID_PATTERN = /^\d{5,20}$/;

const getWindowObject = () => (typeof window === 'undefined' ? null : window);
const getDocumentObject = () => (typeof document === 'undefined' ? null : document);

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveEventValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Number(parsed.toFixed(2));
};

const normalizeContentIds = (ids = []) => {
  const source = Array.isArray(ids) ? ids : [ids];
  return source
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const normalizeEventPayload = (payload = {}) => {
  const normalized = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    normalized[key] = value;
  });
  return normalized;
};

const getGlobalState = () => {
  const win = getWindowObject();
  if (!win) return null;

  if (!win[GLOBAL_STATE_KEY] || typeof win[GLOBAL_STATE_KEY] !== 'object') {
    win[GLOBAL_STATE_KEY] = {
      initializedIds: {},
      lastPageViewPath: '',
      lastPageViewAt: 0,
    };
  }

  return win[GLOBAL_STATE_KEY];
};

const ensureFbqStub = () => {
  const win = getWindowObject();
  if (!win) return null;

  if (typeof win.fbq === 'function') {
    return win.fbq;
  }

  const fbq = function (...args) {
    if (typeof fbq.callMethod === 'function') {
      fbq.callMethod.apply(fbq, args);
      return;
    }
    fbq.queue.push(args);
  };

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  win.fbq = fbq;
  if (!win._fbq) {
    win._fbq = fbq;
  }

  return fbq;
};

const ensureFacebookEventsScript = () => {
  const doc = getDocumentObject();
  if (!doc) return false;

  const hasScript = Array.from(doc.getElementsByTagName('script')).some((script) => {
    const src = String(script.getAttribute('src') || script.src || '').trim();
    return src === FB_EVENTS_SRC;
  });

  if (hasScript) return true;

  const script = doc.createElement('script');
  script.async = true;
  script.src = FB_EVENTS_SRC;
  script.setAttribute('data-fb-events-core', '1');
  doc.head.appendChild(script);

  return true;
};

const toCurrentPath = () => {
  const win = getWindowObject();
  if (!win) return '';
  return `${win.location.pathname}${win.location.search}`;
};

const callFbqTrack = (eventName, payload) => {
  const win = getWindowObject();
  if (!win || typeof win.fbq !== 'function') return false;

  try {
    if (payload && Object.keys(payload).length > 0) {
      win.fbq('track', eventName, payload);
    } else {
      win.fbq('track', eventName);
    }
    return true;
  } catch (error) {
    console.error(`Facebook Pixel "${eventName}" tracking failed`, error);
    return false;
  }
};

export const ensureFacebookPixelReady = () => {
  if (!getWindowObject() || !getDocumentObject()) return false;

  ensureFbqStub();
  ensureFacebookEventsScript();
  getGlobalState();

  return true;
};

export const initializeFacebookPixelId = (pixelId) => {
  const normalizedId = String(pixelId || '').trim();
  if (!SIMPLE_PIXEL_ID_PATTERN.test(normalizedId)) return false;
  if (!ensureFacebookPixelReady()) return false;

  const state = getGlobalState();
  if (state?.initializedIds?.[normalizedId]) return true;

  try {
    window.fbq('init', normalizedId);
    if (state) {
      state.initializedIds[normalizedId] = true;
    }
    return true;
  } catch (error) {
    console.error(`Facebook Pixel init failed for ID "${normalizedId}"`, error);
    return false;
  }
};

export const trackFacebookPageView = () => {
  if (!ensureFacebookPixelReady()) return false;

  const state = getGlobalState();
  const currentPath = toCurrentPath();
  const now = Date.now();

  if (
    state &&
    state.lastPageViewPath === currentPath &&
    now - normalizeNumber(state.lastPageViewAt, 0) < PAGE_VIEW_DEDUPE_WINDOW_MS
  ) {
    return false;
  }

  const tracked = callFbqTrack('PageView');
  if (tracked && state) {
    state.lastPageViewPath = currentPath;
    state.lastPageViewAt = now;
  }

  return tracked;
};

export const trackFacebookViewContent = ({
  productId,
  sku,
  name,
  value,
  quantity = 1,
  currency = 'BDT',
} = {}) => {
  if (!ensureFacebookPixelReady()) return false;

  const contentIds = normalizeContentIds([productId, sku]);
  const payload = normalizeEventPayload({
    content_ids: contentIds.length > 0 ? contentIds : undefined,
    content_type: contentIds.length > 0 ? 'product' : undefined,
    content_name: String(name || '').trim() || undefined,
    value: resolveEventValue(value),
    currency: String(currency || 'BDT').trim().toUpperCase() || 'BDT',
    num_items: normalizeNumber(quantity, 1),
  });

  return callFbqTrack('ViewContent', payload);
};

export const trackFacebookAddToCart = ({
  productId,
  sku,
  name,
  value,
  quantity = 1,
  currency = 'BDT',
} = {}) => {
  if (!ensureFacebookPixelReady()) return false;

  const contentIds = normalizeContentIds([productId, sku]);
  const payload = normalizeEventPayload({
    content_ids: contentIds.length > 0 ? contentIds : undefined,
    content_type: contentIds.length > 0 ? 'product' : undefined,
    content_name: String(name || '').trim() || undefined,
    value: resolveEventValue(value),
    currency: String(currency || 'BDT').trim().toUpperCase() || 'BDT',
    num_items: normalizeNumber(quantity, 1),
  });

  return callFbqTrack('AddToCart', payload);
};

export const trackFacebookInitiateCheckout = ({
  itemIds = [],
  value,
  quantity,
  currency = 'BDT',
} = {}) => {
  if (!ensureFacebookPixelReady()) return false;

  const normalizedItemIds = normalizeContentIds(itemIds);
  const payload = normalizeEventPayload({
    content_ids: normalizedItemIds.length > 0 ? normalizedItemIds : undefined,
    content_type: normalizedItemIds.length > 0 ? 'product' : undefined,
    value: resolveEventValue(value),
    currency: String(currency || 'BDT').trim().toUpperCase() || 'BDT',
    num_items: normalizeNumber(quantity, normalizedItemIds.length || 1),
  });

  return callFbqTrack('InitiateCheckout', payload);
};

export const trackFacebookPurchase = ({
  orderId,
  itemIds = [],
  value,
  quantity,
  currency = 'BDT',
} = {}) => {
  if (!ensureFacebookPixelReady()) return false;

  const normalizedItemIds = normalizeContentIds(itemIds);
  const payload = normalizeEventPayload({
    content_ids: normalizedItemIds.length > 0 ? normalizedItemIds : undefined,
    content_type: normalizedItemIds.length > 0 ? 'product' : undefined,
    value: resolveEventValue(value),
    currency: String(currency || 'BDT').trim().toUpperCase() || 'BDT',
    num_items: normalizeNumber(quantity, normalizedItemIds.length || 1),
    order_id: String(orderId || '').trim() || undefined,
  });

  return callFbqTrack('Purchase', payload);
};
