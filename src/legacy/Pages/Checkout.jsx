import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";
import {
  useCheckoutMutation,
  useDeleteCartItemMutation,
  useGetCartQuery,
  useGetShippingChargesQuery,
  useTrackIncompleteOrderMutation,
  useUpdateCartItemMutation,
} from "../store/publicApi";
import { resolveMediaUrl } from "../utils/media";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMinus,
  FiPlus,
  FiTrash2,
  FiShoppingBag,
  FiMapPin,
  FiPhone,
  FiUser,
  FiInfo,
} from "react-icons/fi";
import { useSettings } from "../context/SettingsContext";
import { showErrorMessage } from "../admin/utils/alerts";
import { trackEvent } from "@/lib/pixel";

const toDigits = (value) => String(value || "").replace(/\D/g, "");
const ORDER_SUCCESS_ACCESS_KEY = "order_success_access_token";

const parseMoney = (value, fallback = 0) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const normalized = String(value ?? "")
    .replace(/[\s,]/g, "")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const isValidBdPhone = (value) => {
  const digits = toDigits(value);
  return /^01\d{9}$/.test(digits) || /^8801\d{9}$/.test(digits);
};

const createOrderSuccessAccessToken = (orderId) => {
  const normalizedOrderId =
    String(orderId || "order")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_") || "order";
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${normalizedOrderId}_${Date.now()}_${randomPart}`;
};

const Checkout = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    area: "",
    payment_method: "Cash On Delivery",
  });
  const [formErrors, setFormErrors] = useState({});
  const { data: cart, isLoading: cartLoading } = useGetCartQuery();
  const { data: shippingResponse, isLoading: shippingLoading } =
    useGetShippingChargesQuery();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [deleteCartItem] = useDeleteCartItemMutation();
  const [checkoutMutation] = useCheckoutMutation();
  const { setting } = useSettings();
  const [trackIncompleteOrder] = useTrackIncompleteOrderMutation();
  const navigate = useNavigate();
  const lastTrackedKeyRef = useRef("");
  const initiateCheckoutTrackedRef = useRef(false);
  const submitLockRef = useRef(false);
  const initiateCheckoutSessionKey = useMemo(() => {
    // Stable key based on cart ID only — does not change on qty/price updates
    // This prevents the effect from re-firing when the user changes quantity
    const cartId = String(cart?.id || "").trim();
    return cartId ? `meta_ic_fired_cart_${cartId}` : "";
  }, [cart?.id]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const shippingCharges = shippingResponse?.data || [];

  const resolveCheckoutImage = (item) => {
    const featureImage =
      typeof item?.product?.feature_image === "string"
        ? item.product.feature_image
        : item?.product?.feature_image?.image;

    const candidates = [
      item?.product_image,
      item?.options?.product_image,
      item?.product?.image?.image,
      featureImage,
      item?.product?.thumbnail,
      item?.product?.image,
    ];

    const found = candidates.find((value) => String(value || "").trim() !== "");
    return resolveMediaUrl(found, "https://placehold.co/80x80?text=Product");
  };

  const items = cart?.items || [];
  const shippingChargeIds = useMemo(
    () =>
      shippingCharges.map((charge) => String(charge?.id || "")).filter(Boolean),
    [shippingCharges],
  );
  const checkoutSchema = useMemo(
    () =>
      Yup.object({
        name: Yup.string()
          .transform((value) => String(value || "").trim())
          .required("Full name is required.")
          .min(2, "Full name must be at least 2 characters.")
          .max(120, "Full name is too long."),
        phone: Yup.string()
          .required("Mobile number is required.")
          .matches(
            /^01[3-9]\d{8}$/,
            "Please enter a valid 11-digit number (e.g., 017XXXXXXXX).",
          )
          .test("valid-bd-phone", "Invalid Bangladeshi number.", (value) =>
            isValidBdPhone(value),
          ),
        address: Yup.string()
          .transform((value) => String(value || "").trim())
          .required("Address is required.")
          .min(5, "Address must be at least 5 characters.")
          .max(500, "Address is too long."),
        area: Yup.string()
          .transform((value) => String(value || "").trim())
          .required("Please select a delivery area.")
          .test(
            "valid-delivery-area",
            "Please select a valid delivery area.",
            (value) => shippingChargeIds.includes(String(value || "")),
          ),
        payment_method: Yup.string()
          .transform((value) => String(value || "").trim())
          .oneOf(["Cash On Delivery"], "Invalid payment method.")
          .required("Payment method is required."),
      }),
    [shippingChargeIds],
  );

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = parseMoney(item?.price, 0);
      const qty = parseMoney(item?.quantity, 0);
      return sum + price * qty;
    }, 0);
  }, [items]);

  const shippingCost = useMemo(() => {
    const charge = shippingCharges.find(
      (c) => String(c.id) === String(formData.area),
    );
    return charge ? parseMoney(charge.amount, 0) : 0;
  }, [shippingCharges, formData.area]);

  const total = subtotal + shippingCost;
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + parseMoney(item?.quantity, 0), 0),
    [items],
  );
  const cartItemContentIds = useMemo(() => {
    const seenIds = new Set();

    return items
      .map(
        (item) =>
          item?.product_id ||
          item?.external_product_id ||
          item?.id ||
          item?.options?.sku,
      )
      .map((id) => String(id || "").trim())
      .filter((id) => {
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });
  }, [items]);
  const phoneDigits = String(formData.phone || "").replace(/\D/g, "");
  const canTrackIncomplete = phoneDigits.length >= 6 && items.length > 0;
  const cartSnapshotKey = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.id || item.external_product_id || "row"}:${item.quantity}:${item.price}`,
        )
        .join("|"),
    [items],
  );
  const trackingPayload = useMemo(
    () => ({
      name: String(formData.name || "").trim() || null,
      phone: String(formData.phone || "").trim(),
      address: String(formData.address || "").trim() || null,
      area: formData.area ? Number(formData.area) : null,
      district: "64",
      cart_id: cart?.id || null,
    }),
    [formData.name, formData.phone, formData.address, formData.area, cart?.id],
  );
  const trackingKey = useMemo(() => {
    if (!canTrackIncomplete) return "";
    return JSON.stringify({
      phone: trackingPayload.phone,
      name: trackingPayload.name,
      address: trackingPayload.address,
      area: trackingPayload.area,
      district: trackingPayload.district,
      cart_id: trackingPayload.cart_id,
      cart: cartSnapshotKey,
    });
  }, [canTrackIncomplete, trackingPayload, cartSnapshotKey]);

  const handleQty = async (itemId, nextQty) => {
    if (nextQty < 1) return;
    try {
      await updateCartItem({ id: itemId, quantity: nextQty }).unwrap();
    } catch (error) {
      console.error("Update cart error:", error);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await deleteCartItem(itemId).unwrap();
    } catch (error) {
      console.error("Remove cart error:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const onlyNums = value.replace(/[^\d]/g, "");

      if (onlyNums.length <= 11) {
        setFormData((prev) => ({ ...prev, [name]: onlyNums }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  useEffect(() => {
    if (!canTrackIncomplete || !trackingKey) return undefined;

    const timeoutId = window.setTimeout(async () => {
      if (lastTrackedKeyRef.current === trackingKey) return;
      try {
        await trackIncompleteOrder(trackingPayload).unwrap();
        lastTrackedKeyRef.current = trackingKey;
      } catch (error) {
        console.error("Incomplete order auto-track failed:", error);
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [canTrackIncomplete, trackingKey, trackingPayload, trackIncompleteOrder]);

  useEffect(() => {
    if (!canTrackIncomplete || !trackingKey) return undefined;
    if (typeof window === "undefined" || typeof document === "undefined")
      return undefined;

    const flushIncompleteWithBeacon = () => {
      if (lastTrackedKeyRef.current === trackingKey) return;
      if (!navigator.sendBeacon) return;

      const apiBase = String(
        process.env.NEXT_PUBLIC_API_BASE_URL || "",
      ).replace(/\/+$/, "");
      if (!apiBase) return;

      const payload = {
        ...trackingPayload,
        cart_id:
          trackingPayload.cart_id ||
          window.localStorage.getItem("cart_id") ||
          null,
      };
      const body = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      const sent = navigator.sendBeacon(
        `${apiBase}/api/v1/incomplete-orders/track`,
        body,
      );

      if (sent) {
        lastTrackedKeyRef.current = trackingKey;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushIncompleteWithBeacon();
      }
    };

    window.addEventListener("beforeunload", flushIncompleteWithBeacon);
    window.addEventListener("pagehide", flushIncompleteWithBeacon);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", flushIncompleteWithBeacon);
      window.removeEventListener("pagehide", flushIncompleteWithBeacon);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canTrackIncomplete, trackingKey, trackingPayload]);

  // Fire InitiateCheckout ONCE per checkout session.
  // Guard layers:
  //   1. initiateCheckoutTrackedRef — in-memory, reset on full page reload
  //   2. sessionStorage key (per cart ID) — survives React re-renders and hot-reloads
  useEffect(() => {
    if (!items.length) return;
    // In-memory guard: already tracked in this component lifetime
    if (initiateCheckoutTrackedRef.current) return;

    // Session-level guard: already tracked for this cart ID in this browser session
    if (initiateCheckoutSessionKey) {
      try {
        if (window.sessionStorage.getItem(initiateCheckoutSessionKey) === "1") {
          initiateCheckoutTrackedRef.current = true;
          return;
        }
      } catch {
        /* sessionStorage unavailable — rely on in-memory guard only */
      }
    }

    // Capture current snapshot of tracking data at the time the effect first runs.
    // We do NOT include these in deps so qty/price changes don't re-trigger the effect.
    const snapshotItemIds = cartItemContentIds;
    const snapshotValue = parseMoney(subtotal, 0);
    const snapshotQty = totalQuantity;

    let attempts = 0;
    const MAX_ATTEMPTS = 100; // ~30 seconds (100 × 300ms)

    const tryFireEvent = () => {
      attempts += 1;

      const tracked = trackEvent(
        "InitiateCheckout",
        {
          content_ids: snapshotItemIds.length > 0 ? snapshotItemIds : undefined,
          content_type: snapshotItemIds.length > 0 ? "product" : undefined,
          value: snapshotValue,
          currency: "BDT",
          num_items: snapshotQty,
        },
        {
          eventId: initiateCheckoutSessionKey || undefined,
        },
      );

      if (!tracked) {
        if (attempts < MAX_ATTEMPTS) return;
        clearInterval(intervalId);
        return;
      }

      initiateCheckoutTrackedRef.current = true;

      // Persist to sessionStorage so React re-mounts don't re-fire
      if (initiateCheckoutSessionKey) {
        try {
          window.sessionStorage.setItem(initiateCheckoutSessionKey, "1");
        } catch {
          /* ignore */
        }
      }

      clearInterval(intervalId);
    };

    const intervalId = setInterval(tryFireEvent, 300);
    tryFireEvent(); // also try immediately

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, initiateCheckoutSessionKey]);
  // ^ Intentionally stable deps: only re-run if cart goes from empty→non-empty
  //   or if the cart ID changes (new cart session). Qty/price/subtotal changes
  //   are captured in the snapshot above and do NOT re-trigger this effect.

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmittingOrder) return;

    submitLockRef.current = true;

    try {
      if (!shippingChargeIds.length) {
        const message = "No delivery area is available right now.";
        setFormErrors((prev) => ({ ...prev, area: message }));
        showErrorMessage(message);
        return;
      }

      try {
        await checkoutSchema.validate(formData, { abortEarly: false });
        setFormErrors({});
      } catch (validationError) {
        const nextErrors = {};
        if (validationError?.inner?.length) {
          validationError.inner.forEach((item) => {
            if (item?.path && !nextErrors[item.path]) {
              nextErrors[item.path] = item.message;
            }
          });
        } else if (validationError?.path) {
          nextErrors[validationError.path] = validationError.message;
        }

        setFormErrors(nextErrors);

        const areaMessage = nextErrors.area;
        const firstMessage = areaMessage || Object.values(nextErrors)[0];
        if (firstMessage) {
          showErrorMessage(firstMessage);
        } else {
          showErrorMessage("Please provide valid checkout information.");
        }
        return;
      }

      setIsSubmittingOrder(true);
      try {
        const response = await checkoutMutation({
          ...formData,
          district: 64,
        }).unwrap();

        if (response?.order_id) {
          const orderId = String(response.order_id).trim();
          const purchaseTrackingPayload = {
            orderId,
            itemIds: cartItemContentIds,
            value: parseMoney(total, 0),
            quantity: totalQuantity,
            currency: "BDT",
          };
          const orderSuccessAccessToken =
            createOrderSuccessAccessToken(orderId);

          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.setItem(
                ORDER_SUCCESS_ACCESS_KEY,
                orderSuccessAccessToken,
              );
            } catch {
              // If session storage is blocked, OrderSuccess guard will safely reject access.
            }
          }

          lastTrackedKeyRef.current = "";
          navigate("/order-success", {
            state: {
              purchaseTracking: purchaseTrackingPayload,
              orderSuccessAccessToken,
            },
          });
        } else {
          showErrorMessage("Order was placed but order ID was not returned.");
          navigate("/");
        }
      } catch (error) {
        const serverErrors =
          error?.data?.errors && typeof error.data.errors === "object"
            ? error.data.errors
            : {};
        const errorEntries = Object.entries(serverErrors);
        const nextErrors = {};
        errorEntries.forEach(([field, messages]) => {
          const firstMessage = Array.isArray(messages) ? messages[0] : messages;
          if (typeof firstMessage === "string" && firstMessage.trim()) {
            nextErrors[field] = firstMessage.trim();
          }
        });

        if (Object.keys(nextErrors).length > 0) {
          setFormErrors((prev) => ({ ...prev, ...nextErrors }));
        }

        const areaMessage =
          (typeof nextErrors.area === "string" && nextErrors.area) ||
          (Array.isArray(serverErrors.area) ? serverErrors.area[0] : null);
        const fallbackMessage =
          areaMessage || error?.data?.message || "Failed to confirm order.";
        showErrorMessage(fallbackMessage);
      } finally {
        setIsSubmittingOrder(false);
      }
    } finally {
      submitLockRef.current = false;
    }
  };

  const isInitialCartLoad = cartLoading && !cart;
  const isInitialShippingLoad = shippingLoading && !shippingResponse;

  const primaryColor = setting?.button_primary_color || "#10b981";
  const secondaryColor = setting?.button_secondary_color || "#059669";

  if (isInitialCartLoad || isInitialShippingLoad) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">Loading...</div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        Cart is empty
      </div>
    );
  }

  return (
    <div className="bg-[#f9fafb] min-h-screen">
      <div className="container mx-auto px-4 py-8 lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 min-[900px]:grid-cols-[3fr_2fr] gap-6 lg:gap-8 items-stretch">
          {/* Left Column: Form Section */}
          <div className="space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-brand-50 rounded-xl text-brand-600">
                  <FiInfo size={24} />
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                    Delivery Information
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Fill in details for quick delivery
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FiUser className="text-gray-400" /> Full Name{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      aria-invalid={Boolean(formErrors.name)}
                      className={`w-full rounded-xl px-4 py-3 text-sm transition-all outline-none ${
                        formErrors.name
                          ? "border border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      }`}
                    />
                    {formErrors.name ? (
                      <p className="text-xs font-medium text-red-600">
                        {formErrors.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FiPhone className="text-gray-400" /> Mobile Number{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="phone"
                      value={formData.phone}
                      type="tel"
                      onChange={handleChange}
                      placeholder="01XXXXXXXXX"
                      maxLength={11}
                      aria-invalid={Boolean(formErrors.phone)}
                      className={`w-full rounded-xl px-4 py-3 text-sm transition-all outline-none ${
                        formErrors.phone
                          ? "border border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      }`}
                    />
                    {formErrors.phone ? (
                      <p className="text-xs font-medium text-red-600">
                        {formErrors.phone}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FiMapPin className="text-gray-400" /> Full Address{" "}
                    <span className="text-red-500">*</span>
                    <span className="text-xs font-normal text-gray-400">
                      (House, Road, Area)
                    </span>
                  </label>
                  <textarea
                    name="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your detailed address"
                    aria-invalid={Boolean(formErrors.address)}
                    className={`w-full rounded-xl px-4 py-3 text-sm transition-all outline-none resize-none ${
                      formErrors.address
                        ? "border border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    }`}
                  />
                  {formErrors.address ? (
                    <p className="text-xs font-medium text-red-600">
                      {formErrors.address}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FiMapPin className="text-brand-500" /> Delivery Area{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`grid grid-cols-1 gap-3 rounded-xl ${
                      formErrors.area
                        ? "border border-red-200 bg-red-50 p-2"
                        : ""
                    }`}>
                    {shippingCharges.map((charge) => {
                      const isActive =
                        String(formData.area) === String(charge.id);
                      return (
                        <label
                          key={charge.id}
                          style={{
                            borderColor: isActive ? primaryColor : undefined,
                            backgroundColor: isActive
                              ? `${primaryColor}10`
                              : undefined,
                            boxShadow: isActive
                              ? `0 0 0 4px ${primaryColor}10`
                              : undefined,
                          }}
                          className={`relative flex items-center justify-between gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            !isActive
                              ? "border-gray-100 bg-white hover:border-gray-200"
                              : ""
                          }`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="area"
                              value={charge.id}
                              checked={isActive}
                              onChange={handleChange}
                              aria-invalid={Boolean(formErrors.area)}
                              style={{ color: primaryColor }}
                              className="w-4 h-4 bg-gray-100 border-gray-300 focus:ring-0"
                            />
                            <span
                              style={{
                                color: isActive ? primaryColor : undefined,
                              }}
                              className={`text-sm font-bold ${!isActive ? "text-gray-700" : ""}`}>
                              {charge.name}
                            </span>
                          </div>
                          <span
                            style={{
                              color: isActive ? primaryColor : undefined,
                            }}
                            className={`text-sm font-medium ${!isActive ? "text-gray-500" : ""}`}>
                            ৳{charge.amount}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {formErrors.area ? (
                    <p className="text-xs font-medium text-red-600">
                      {formErrors.area}
                    </p>
                  ) : null}
                </div>

                <div className="hidden">
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    aria-disabled={isSubmittingOrder}
                    style={{ backgroundColor: primaryColor }}
                    className={`w-full text-white py-4 rounded-xl font-bold transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${isSubmittingOrder ? "cursor-wait opacity-80" : "hover:brightness-95"}`}>
                    {isSubmittingOrder ? (
                      "Confirming..."
                    ) : (
                      <>
                        <span>Confirm Order •</span>
                        <span className="tabular-nums">৳{total}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Right Column: Order Summary Section */}
          <div className="w-full min-[900px]:sticky min-[900px]:top-4 lg:top-8 space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FiShoppingBag className="text-brand-500" /> Order Summary
                  </h2>
                  <span className="px-2.5 py-1 bg-brand-50 text-brand-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                    {items.length} {items.length === 1 ? "Item" : "Items"}
                  </span>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 no-scrollbar">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => {
                    const productName =
                      item.product_name || item.product?.name || "Product";
                    const imageSrc = resolveCheckoutImage(item);
                    const lineTotal =
                      parseMoney(item?.price, 0) *
                      parseMoney(item?.quantity, 0);

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={item.id}
                        className="flex gap-4 group">
                        <div className="relative flex-shrink-0">
                          <img
                            src={imageSrc}
                            alt={productName}
                            className="h-20 w-20 rounded-xl border border-gray-100 object-cover bg-gray-50 group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-tight">
                              {productName}
                            </h3>
                            <button
                              type="button"
                              onClick={() => handleRemove(item.id)}
                              className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                              title="Remove Item">
                              <FiTrash2 size={16} />
                            </button>
                          </div>

                          {item.options?.product_size && (
                            <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                              {item.options.product_size} •{" "}
                              {item.options.product_color}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQty(item.id, item.quantity - 1)
                                }
                                style={{ color: primaryColor }}
                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-white rounded transition-all shadow-none hover:shadow-sm">
                                <FiMinus size={12} />
                              </button>
                              <span className="w-8 text-center text-[12px] font-bold text-gray-700">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQty(item.id, item.quantity + 1)
                                }
                                style={{ color: primaryColor }}
                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-white rounded transition-all shadow-none hover:shadow-sm">
                                <FiPlus size={12} />
                              </button>
                            </div>
                            <p className="text-sm font-bold text-gray-900">
                              <span className="tabular-nums">৳{lineTotal}</span>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="p-6 bg-gray-50/50 space-y-3 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    ৳{subtotal}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 pb-1">
                  <span>Shipping</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    ৳{shippingCost}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-base font-bold text-gray-900">
                    Total Payable
                  </span>
                  <span
                    style={{ color: primaryColor }}
                    className="text-xl font-black tabular-nums">
                    ৳{total}
                  </span>
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                  disabled={isSubmittingOrder}
                  aria-disabled={isSubmittingOrder}
                  style={{ backgroundColor: primaryColor }}
                  className={`flex w-full text-white py-4 rounded-xl font-bold transition-all transform active:scale-[0.98] items-center justify-center gap-2 group shadow-lg ${isSubmittingOrder ? "cursor-wait opacity-80" : "hover:brightness-95"}`}>
                  {isSubmittingOrder ? "Confirming..." : "Confirm Order"}
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}>
                    →
                  </motion.div>
                </button>
                <p className="text-[11px] text-center text-gray-400 mt-4 px-4 uppercase tracking-tighter font-medium">
                  secure checkout • items are reserved for 15 minutes
                </p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
