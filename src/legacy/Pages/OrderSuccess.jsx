import React, { useEffect, useMemo, useRef } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { FiCheckCircle, FiHome, FiPhoneCall } from "react-icons/fi";
import { useSettings } from "../context/SettingsContext";
import { useSiteData } from "../context/SiteDataContext";
import {
  hasInitializedPixel,
  hasTrackedFacebookPurchase,
  trackFacebookPurchase,
} from "../utils/facebookPixel";

const FALLBACK_HOTLINE =
  process.env.NEXT_PUBLIC_CONTACT_PHONE || "01700-000000";
const PURCHASE_EVENT_ID_PREFIX = "purchase_";
const ORDER_SUCCESS_ACCESS_KEY = "order_success_access_token";

const toDigits = (value) => String(value || "").replace(/\D/g, "");
const normalizeOrderSuccessAccessToken = (value) => String(value || "").trim();

const pickFirstValue = (...candidates) => {
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }
  return "";
};

const normalizePurchaseTrackingPayload = (payload) => {
  if (!payload || typeof payload !== "object") return null;

  const orderId = String(payload.orderId || "").trim();
  if (!orderId) return null;

  const itemIds = Array.isArray(payload.itemIds)
    ? payload.itemIds
        .map((itemId) => String(itemId || "").trim())
        .filter(Boolean)
    : [];
  const parsedValue = Number(payload.value);
  const parsedQuantity = Number(payload.quantity);

  return {
    orderId,
    itemIds,
    value: Number.isFinite(parsedValue) ? parsedValue : 0,
    quantity:
      Number.isFinite(parsedQuantity) && parsedQuantity > 0
        ? parsedQuantity
        : itemIds.length || 1,
    currency: String(payload.currency || "BDT").trim() || "BDT",
  };
};

const buildPurchaseEventId = (orderId) => {
  const normalizedOrderId = String(orderId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  return normalizedOrderId
    ? `${PURCHASE_EVENT_ID_PREFIX}${normalizedOrderId}`
    : "";
};

const clearPurchaseTrackingHistoryState = () => {
  if (typeof window === "undefined") return;
  if (!window.history || typeof window.history.replaceState !== "function")
    return;

  const currentHistoryState = window.history.state;
  if (!currentHistoryState || typeof currentHistoryState !== "object") return;

  const currentUserState = currentHistoryState.usr;
  if (!currentUserState || typeof currentUserState !== "object") return;

  const hasPurchaseTracking = Object.prototype.hasOwnProperty.call(
    currentUserState,
    "purchaseTracking",
  );
  const hasOrderSuccessAccessToken = Object.prototype.hasOwnProperty.call(
    currentUserState,
    "orderSuccessAccessToken",
  );
  if (!hasPurchaseTracking && !hasOrderSuccessAccessToken) return;

  const restUserState = { ...currentUserState };
  delete restUserState.purchaseTracking;
  delete restUserState.orderSuccessAccessToken;

  try {
    window.history.replaceState(
      { ...currentHistoryState, usr: restUserState },
      document.title,
      window.location.href,
    );
  } catch {
    // Ignore history state write issues and keep storage-based dedupe only.
  }
};

const OrderSuccess = () => {
  const location = useLocation();
  const { setting } = useSettings();
  const { contact } = useSiteData();
  const hasTrackedPurchaseRef = useRef(false);

  const purchaseTrackingPayload = useMemo(
    () => normalizePurchaseTrackingPayload(location.state?.purchaseTracking),
    [location.state],
  );
  const orderSuccessAccessToken = useMemo(
    () =>
      normalizeOrderSuccessAccessToken(location.state?.orderSuccessAccessToken),
    [location.state],
  );
  const canAccessOrderSuccess = useMemo(() => {
    if (!purchaseTrackingPayload) return false;
    if (!orderSuccessAccessToken) return false;
    if (typeof window === "undefined") return false;

    try {
      const storedToken = normalizeOrderSuccessAccessToken(
        window.sessionStorage.getItem(ORDER_SUCCESS_ACCESS_KEY),
      );
      return storedToken ? storedToken === orderSuccessAccessToken : true;
    } catch {
      // Fall back to state-based access if storage is unavailable.
      return true;
    }
  }, [purchaseTrackingPayload, orderSuccessAccessToken]);

  const hotlineNumber = useMemo(
    () =>
      pickFirstValue(
        contact?.hotline,
        contact?.phone,
        setting?.hotline,
        setting?.phone,
        FALLBACK_HOTLINE,
      ),
    [contact?.hotline, contact?.phone, setting?.hotline, setting?.phone],
  );
  const hotlineHref = toDigits(hotlineNumber)
    ? `tel:${toDigits(hotlineNumber)}`
    : "#";

  useEffect(() => {
    if (!canAccessOrderSuccess) return;
    if (!purchaseTrackingPayload || hasTrackedPurchaseRef.current) return;
    if (typeof window === "undefined") return;

    const orderId = purchaseTrackingPayload.orderId;
    const purchaseEventId = buildPurchaseEventId(orderId);

    if (hasTrackedFacebookPurchase(orderId)) {
      hasTrackedPurchaseRef.current = true;
      clearPurchaseTrackingHistoryState();
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 100; // ~30 seconds (100 × 300ms)

    const tryTrackPurchase = () => {
      attempts += 1;

      if (!hasInitializedPixel() && attempts < MAX_ATTEMPTS) return;

      const tracked = trackFacebookPurchase({
        ...purchaseTrackingPayload,
        eventId: purchaseEventId || undefined,
      });
      if (tracked) {
        hasTrackedPurchaseRef.current = true;
        clearPurchaseTrackingHistoryState();
        clearInterval(intervalId);
        return;
      }

      if (hasTrackedFacebookPurchase(orderId)) {
        hasTrackedPurchaseRef.current = true;
        clearPurchaseTrackingHistoryState();
        clearInterval(intervalId);
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
      }
    };

    const intervalId = window.setInterval(tryTrackPurchase, 300);
    tryTrackPurchase();

    return () => window.clearInterval(intervalId);
  }, [canAccessOrderSuccess, purchaseTrackingPayload]);

  if (!canAccessOrderSuccess) {
    return <Navigate to="/checkout" replace />;
  }

  return (
    <div className="min-h-[65vh] bg-[#edf1f7] px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-2xl rounded-[28px] border border-[#d7dee9] bg-white p-6 text-center shadow-[0_16px_50px_rgba(15,23,42,0.12)] md:p-10">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#ecfdf3] ring-8 ring-[#f4fdf8]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dcfce7]">
            <FiCheckCircle className="h-10 w-10 text-[#15803d]" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-[#111827] md:text-4xl">
          Order Successful!
        </h2>

        <div className="mt-5 space-y-3 rounded-2xl border border-[#d7e6ff] bg-gradient-to-br from-[#f8fbff] to-[#eef5ff] px-4 py-5 text-left text-[15px] leading-relaxed text-[#1f2937] md:px-6">
          <p>Your order has been successfully received.</p>
          <p>
            One of our representatives will contact you shortly at:{" "}
            <a
              href={hotlineHref}
              className="inline-flex items-center gap-1.5 font-bold text-[#1d4ed8] hover:text-[#1e40af]">
              <FiPhoneCall className="text-sm" />
              {hotlineNumber}
            </a>
          </p>
          <p>Please wait a moment for our call. Thank you.</p>
        </div>

        <div className="mt-7">
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#111827] bg-[#111827] px-6 py-3 font-semibold text-white transition hover:bg-[#1f2937] md:w-auto">
            <FiHome />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
