const FB_EVENTS_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const PAGE_VIEW_DEDUPE_WINDOW_MS = 600;
const GLOBAL_STATE_KEY = "__legacyFacebookPixelState";
const SIMPLE_PIXEL_ID_PATTERN = /^\d{5,20}$/;
const PIXEL_DEBUG_STORAGE_KEY = "pixel_debug";
const TRUTHY_VALUES = ["1", "true", "yes", "on"];

const getWindowObject = () => (typeof window === "undefined" ? null : window);
const getDocumentObject = () =>
  typeof document === "undefined" ? null : document;

const parseNumericValue = (value, fallback = NaN) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[\s,]/g, "").replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = parseNumericValue(value, NaN);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveEventValue = (value) => {
  const parsed = parseNumericValue(value, NaN);
  if (!Number.isFinite(parsed)) return undefined;
  return Number(parsed.toFixed(2));
};

const normalizeCurrency = (value, fallback = "BDT") => {
  const normalized = String(value || fallback)
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
};

const isPixelDebugEnabled = () => {
  const envFlag = String(process.env.NEXT_PUBLIC_PIXEL_DEBUG || "")
    .trim()
    .toLowerCase();
  if (TRUTHY_VALUES.includes(envFlag)) return true;

  const win = getWindowObject();
  if (!win || !win.localStorage) return false;

  try {
    const localFlag = String(
      win.localStorage.getItem(PIXEL_DEBUG_STORAGE_KEY) || "",
    )
      .trim()
      .toLowerCase();
    return TRUTHY_VALUES.includes(localFlag);
  } catch {
    return false;
  }
};

const debugPixel = (message, payload) => {
  if (!isPixelDebugEnabled()) return;
  if (payload === undefined) {
    console.info(`[MetaPixel] ${message}`);
    return;
  }
  console.info(`[MetaPixel] ${message}`, payload);
};

const normalizeContentIds = (ids = []) => {
  const source = Array.isArray(ids) ? ids : [ids];
  const seenIds = new Set();

  return source
    .map((item) => String(item || "").trim())
    .filter((id) => {
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
};

const normalizeEventPayload = (payload = {}) => {
  const normalized = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    normalized[key] = value;
  });
  return normalized;
};

const getGlobalState = () => {
  const win = getWindowObject();
  if (!win) return null;

  if (!win[GLOBAL_STATE_KEY] || typeof win[GLOBAL_STATE_KEY] !== "object") {
    win[GLOBAL_STATE_KEY] = {
      initializedIds: {},
      lastPageViewPath: "",
      lastPageViewAt: 0,
      trackedPurchases: {},
    };
  }

  if (
    !win[GLOBAL_STATE_KEY].initializedIds ||
    typeof win[GLOBAL_STATE_KEY].initializedIds !== "object"
  ) {
    win[GLOBAL_STATE_KEY].initializedIds = {};
  }
  if (
    !win[GLOBAL_STATE_KEY].trackedPurchases ||
    typeof win[GLOBAL_STATE_KEY].trackedPurchases !== "object"
  ) {
    win[GLOBAL_STATE_KEY].trackedPurchases = {};
  }

  return win[GLOBAL_STATE_KEY];
};

const ensureFbqStub = () => {
  const win = getWindowObject();
  if (!win) return null;

  const state = getGlobalState();

  // Helper to update our internal state when fbq('init', id) is called
  const trackInitCall = (args) => {
    if (args[0] === "init" && args[1] && state) {
      const id = String(args[1]).trim();
      if (id) state.initializedIds[id] = true;
    }
  };

  const existingFbq = win.fbq;

  // If fbq is already a functional wrapper we created, just return it
  if (typeof existingFbq === "function" && existingFbq.__isLegacyWrapper) {
    return existingFbq;
  }

  const fbqWrapper = function (...args) {
    trackInitCall(args);

    if (typeof fbqWrapper.callMethod === "function") {
      fbqWrapper.callMethod.apply(fbqWrapper, args);
      return;
    }
    fbqWrapper.queue.push(args);
  };

  fbqWrapper.__isLegacyWrapper = true;
  fbqWrapper.push = fbqWrapper;
  fbqWrapper.loaded = true;
  fbqWrapper.version = "2.0";
  fbqWrapper.queue = [];

  // If there was an existing fbq, migrate its queue and properties
  if (typeof existingFbq === "function") {
    fbqWrapper.queue = Array.isArray(existingFbq.queue)
      ? existingFbq.queue
      : [];
    fbqWrapper.loaded = existingFbq.loaded ?? true;
    fbqWrapper.version = existingFbq.version ?? "2.0";

    // Process the existing queue characters to update our state for any 'init' calls already made
    fbqWrapper.queue.forEach((args) => trackInitCall(args));
  }

  win.fbq = fbqWrapper;
  if (!win._fbq) {
    win._fbq = fbqWrapper;
  }

  return fbqWrapper;
};

const ensureFacebookEventsScript = () => {
  const doc = getDocumentObject();
  if (!doc) return false;

  const hasScript = Array.from(doc.getElementsByTagName("script")).some(
    (script) => {
      const src = String(script.getAttribute("src") || script.src || "").trim();
      return src === FB_EVENTS_SRC;
    },
  );

  if (hasScript) return true;

  const script = doc.createElement("script");
  script.async = true;
  script.src = FB_EVENTS_SRC;
  script.setAttribute("data-fb-events-core", "1");
  doc.head.appendChild(script);

  return true;
};

const toCurrentPath = () => {
  const win = getWindowObject();
  if (!win) return "";
  return `${win.location.pathname}${win.location.search}`;
};

const normalizeTrackOptions = (options = {}) =>
  normalizeEventPayload({
    eventID:
      String(options.eventId || options.eventID || "").trim() || undefined,
  });

const callFbqTrack = (eventName, payload, options = {}) => {
  const win = getWindowObject();
  if (!win || typeof win.fbq !== "function") return false;

  const normalizedPayload =
    payload && typeof payload === "object" ? payload : undefined;
  const normalizedOptions = normalizeTrackOptions(options);
  const hasPayload = !!(
    normalizedPayload && Object.keys(normalizedPayload).length > 0
  );
  const hasOptions = Object.keys(normalizedOptions).length > 0;

  try {
    debugPixel(`track:${eventName}`, {
      ...(normalizedPayload || {}),
      ...(hasOptions ? { _meta_track_options: normalizedOptions } : {}),
    });

    if (hasPayload && hasOptions) {
      win.fbq("track", eventName, normalizedPayload, normalizedOptions);
    } else if (hasPayload) {
      win.fbq("track", eventName, normalizedPayload);
    } else if (hasOptions) {
      win.fbq("track", eventName, {}, normalizedOptions);
    } else {
      win.fbq("track", eventName);
    }
    return true;
  } catch (error) {
    console.error(`Facebook Pixel "${eventName}" tracking failed`, error);
    return false;
  }
};

export const hasInitializedPixel = () => {
  const state = getGlobalState();
  if (!state) return false;
  return Object.keys(state.initializedIds || {}).length > 0;
};

export const ensureFacebookPixelReady = () => {
  if (!getWindowObject() || !getDocumentObject()) return false;

  ensureFbqStub();
  ensureFacebookEventsScript();
  getGlobalState();

  return true;
};

export const initializeFacebookPixelId = (pixelId) => {
  const normalizedId = String(pixelId || "").trim();
  if (!SIMPLE_PIXEL_ID_PATTERN.test(normalizedId)) return false;
  if (!ensureFacebookPixelReady()) return false;

  const state = getGlobalState();
  if (state?.initializedIds?.[normalizedId]) return true;

  try {
    window.fbq("init", normalizedId);
    if (state) {
      state.initializedIds[normalizedId] = true;
    }
    debugPixel("init", { pixelId: normalizedId });
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

  const tracked = callFbqTrack("PageView");
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
  currency = "BDT",
} = {}) => {
  if (!ensureFacebookPixelReady()) return false;

  const contentIds = normalizeContentIds([productId, sku]);
  const payload = normalizeEventPayload({
    content_ids: contentIds.length > 0 ? contentIds : undefined,
    content_type: contentIds.length > 0 ? "product" : undefined,
    content_name: String(name || "").trim() || undefined,
    value: resolveEventValue(value),
    currency: normalizeCurrency(currency, "BDT"),
    num_items: normalizeNumber(quantity, 1),
  });

  return callFbqTrack("ViewContent", payload);
};

export const trackFacebookAddToCart = ({
  productId,
  sku,
  name,
  value,
  quantity = 1,
  currency = "BDT",
} = {}) => {
  if (!ensureFacebookPixelReady()) return false;

  const contentIds = normalizeContentIds([productId, sku]);
  const payload = normalizeEventPayload({
    content_ids: contentIds.length > 0 ? contentIds : undefined,
    content_type: contentIds.length > 0 ? "product" : undefined,
    content_name: String(name || "").trim() || undefined,
    value: resolveEventValue(value),
    currency: normalizeCurrency(currency, "BDT"),
    num_items: normalizeNumber(quantity, 1),
  });

  return callFbqTrack("AddToCart", payload);
};

export const trackFacebookInitiateCheckout = ({
  itemIds = [],
  value,
  quantity,
  currency = "BDT",
} = {}) => {
  if (!ensureFacebookPixelReady()) return false;

  const normalizedItemIds = normalizeContentIds(itemIds);
  const payload = normalizeEventPayload({
    content_ids: normalizedItemIds.length > 0 ? normalizedItemIds : undefined,
    content_type: normalizedItemIds.length > 0 ? "product" : undefined,
    value: resolveEventValue(value),
    currency: normalizeCurrency(currency, "BDT"),
    num_items: normalizeNumber(quantity, normalizedItemIds.length || 1),
  });

  return callFbqTrack("InitiateCheckout", payload);
};

export const trackFacebookPurchase = ({
  orderId,
  itemIds = [],
  value,
  quantity,
  currency = "BDT",
  eventId,
} = {}) => {
  if (!ensureFacebookPixelReady()) return false;

  const state = getGlobalState();
  const normalizedOrderId = String(orderId || "").trim();

  if (normalizedOrderId && state?.trackedPurchases?.[normalizedOrderId]) {
    debugPixel("skip:purchase-duplicate", { orderId: normalizedOrderId });
    return false;
  }

  const normalizedItemIds = normalizeContentIds(itemIds);
  const payload = normalizeEventPayload({
    content_ids: normalizedItemIds.length > 0 ? normalizedItemIds : undefined,
    content_type: normalizedItemIds.length > 0 ? "product" : undefined,
    value: resolveEventValue(value),
    currency: normalizeCurrency(currency, "BDT"),
    num_items: normalizeNumber(quantity, normalizedItemIds.length || 1),
    order_id: normalizedOrderId || undefined,
  });

  const tracked = callFbqTrack("Purchase", payload, { eventId });
  if (tracked && normalizedOrderId && state) {
    state.trackedPurchases[normalizedOrderId] = Date.now();
  }

  return tracked;
};
