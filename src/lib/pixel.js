const ORDER_EVENT_STORAGE_PREFIX = 'meta_pixel_order_event_';
const trackedOrderEvents = new Set();

const isBrowser = () => typeof window !== 'undefined';

const normalizeText = (value) => String(value ?? '').trim();

const normalizeStorageKeyPart = (value) =>
  normalizeText(value).replace(/[^a-zA-Z0-9_-]/g, '_');

const normalizePayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return {};

  const normalized = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    normalized[key] = value;
  });

  return normalized;
};

const normalizeTrackOptions = (options = {}) => {
  const eventId = normalizeText(options.eventId || options.eventID);
  return eventId ? { eventID: eventId } : {};
};

const getFbq = () => {
  if (!isBrowser()) return null;
  return typeof window.fbq === 'function' ? window.fbq : null;
};

const buildOrderEventKey = (eventName, orderId) => {
  const normalizedEventName = normalizeText(eventName).toLowerCase();
  const normalizedOrderId = normalizeStorageKeyPart(orderId);

  if (!normalizedEventName || !normalizedOrderId) return '';

  return `${normalizedEventName}_${normalizedOrderId}`;
};

const readOrderEventMarker = (orderEventKey) => {
  if (!isBrowser() || !orderEventKey) return false;

  try {
    return (
      window.localStorage.getItem(
        `${ORDER_EVENT_STORAGE_PREFIX}${orderEventKey}`,
      ) === '1'
    );
  } catch {
    return false;
  }
};

const writeOrderEventMarker = (orderEventKey) => {
  if (!isBrowser() || !orderEventKey) return false;

  try {
    window.localStorage.setItem(
      `${ORDER_EVENT_STORAGE_PREFIX}${orderEventKey}`,
      '1',
    );
    return true;
  } catch {
    return false;
  }
};

export const trackEvent = (eventName, payload = {}, options = {}) => {
  const fbq = getFbq();
  const normalizedEventName = normalizeText(eventName);

  if (!fbq || !normalizedEventName) return false;

  const normalizedPayload = normalizePayload(payload);
  const normalizedOptions = normalizeTrackOptions(options);
  const hasPayload = Object.keys(normalizedPayload).length > 0;
  const hasOptions = Object.keys(normalizedOptions).length > 0;

  try {
    if (hasPayload && hasOptions) {
      fbq('track', normalizedEventName, normalizedPayload, normalizedOptions);
    } else if (hasPayload) {
      fbq('track', normalizedEventName, normalizedPayload);
    } else if (hasOptions) {
      fbq('track', normalizedEventName, {}, normalizedOptions);
    } else {
      fbq('track', normalizedEventName);
    }

    return true;
  } catch (error) {
    console.error(`Meta Pixel "${normalizedEventName}" tracking failed`, error);
    return false;
  }
};

export const trackPageView = () => trackEvent('PageView');

export const trackOrderEvent = (
  eventName,
  orderId,
  payload = {},
  options = {},
) => {
  const orderEventKey = buildOrderEventKey(eventName, orderId);
  if (!orderEventKey) return false;

  if (
    trackedOrderEvents.has(orderEventKey) ||
    readOrderEventMarker(orderEventKey)
  ) {
    trackedOrderEvents.add(orderEventKey);
    return false;
  }

  const tracked = trackEvent(eventName, payload, options);
  if (!tracked) return false;

  trackedOrderEvents.add(orderEventKey);
  writeOrderEventMarker(orderEventKey);

  return true;
};
