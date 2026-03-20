import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import {
    useCheckoutMutation,
    useDeleteCartItemMutation,
    useGetCartQuery,
    useGetShippingChargesQuery,
    useTrackIncompleteOrderMutation,
    useUpdateCartItemMutation,
} from '../store/publicApi';
import { resolveMediaUrl } from '../utils/media';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMinus, FiPlus, FiTrash2, FiShoppingBag, FiMapPin, FiPhone, FiUser, FiInfo } from 'react-icons/fi';
import { useSettings } from '../context/SettingsContext';
import { showErrorMessage } from '../admin/utils/alerts';
import {
    trackFacebookInitiateCheckout,
    trackFacebookPurchase,
    hasInitializedPixel,
} from '../utils/facebookPixel';

const toDigits = (value) => String(value || '').replace(/\D/g, '');

const isValidBdPhone = (value) => {
    const digits = toDigits(value);
    return /^01\d{9}$/.test(digits) || /^8801\d{9}$/.test(digits);
};

const Checkout = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        area: '',
        payment_method: 'Cash On Delivery',
    });
    const [formErrors, setFormErrors] = useState({});
    const { data: cart, isLoading: cartLoading } = useGetCartQuery();
    const {
        data: shippingResponse,
        isLoading: shippingLoading,
    } = useGetShippingChargesQuery();
    const [updateCartItem] = useUpdateCartItemMutation();
    const [deleteCartItem] = useDeleteCartItemMutation();
    const [checkoutMutation] = useCheckoutMutation();
    const { setting } = useSettings();
    const [trackIncompleteOrder] = useTrackIncompleteOrderMutation();
    const navigate = useNavigate();
    const lastTrackedKeyRef = useRef('');
    const initiateCheckoutTrackedRef = useRef('');

    const shippingCharges = shippingResponse?.data || [];

    const resolveCheckoutImage = (item) => {
        const featureImage = typeof item?.product?.feature_image === 'string'
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

        const found = candidates.find((value) => String(value || '').trim() !== '');
        return resolveMediaUrl(found, 'https://placehold.co/80x80?text=Product');
    };


    const items = cart?.items || [];
    const shippingChargeIds = useMemo(
        () => shippingCharges.map((charge) => String(charge?.id || '')).filter(Boolean),
        [shippingCharges]
    );
    const checkoutSchema = useMemo(
        () =>
            Yup.object({
                name: Yup.string()
                    .transform((value) => String(value || '').trim())
                    .required('Full name is required.')
                    .min(2, 'Full name must be at least 2 characters.')
                    .max(120, 'Full name is too long.'),
                phone: Yup.string()
                    .required('Mobile number is required.')
                    .test(
                        'valid-bd-phone',
                        'Please enter a valid mobile number.',
                        (value) => isValidBdPhone(value)
                    ),
                address: Yup.string()
                    .transform((value) => String(value || '').trim())
                    .required('Address is required.')
                    .min(5, 'Address must be at least 5 characters.')
                    .max(500, 'Address is too long.'),
                area: Yup.string()
                    .transform((value) => String(value || '').trim())
                    .required('Please select a delivery area.')
                    .test(
                        'valid-delivery-area',
                        'Please select a valid delivery area.',
                        (value) => shippingChargeIds.includes(String(value || ''))
                    ),
                payment_method: Yup.string()
                    .transform((value) => String(value || '').trim())
                    .oneOf(['Cash On Delivery'], 'Invalid payment method.')
                    .required('Payment method is required.'),
            }),
        [shippingChargeIds]
    );

    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    }, [items]);

    const shippingCost = useMemo(() => {
        const charge = shippingCharges.find((c) => String(c.id) === String(formData.area));
        return charge ? Number(charge.amount) : 0;
    }, [shippingCharges, formData.area]);

    const total = subtotal + shippingCost;
    const totalQuantity = useMemo(
        () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        [items]
    );
    const cartItemContentIds = useMemo(
        () => items
            .map((item) => item?.product_id || item?.external_product_id || item?.id || item?.options?.sku)
            .map((id) => String(id || '').trim())
            .filter(Boolean),
        [items]
    );
    const phoneDigits = String(formData.phone || '').replace(/\D/g, '');
    const canTrackIncomplete = phoneDigits.length >= 6 && items.length > 0;
    const cartSnapshotKey = useMemo(
        () => items
            .map((item) => `${item.id || item.external_product_id || 'row'}:${item.quantity}:${item.price}`)
            .join('|'),
        [items]
    );
    const trackingPayload = useMemo(() => ({
        name: String(formData.name || '').trim() || null,
        phone: String(formData.phone || '').trim(),
        address: String(formData.address || '').trim() || null,
        area: formData.area ? Number(formData.area) : null,
        district: '64',
        cart_id: cart?.id || null,
    }), [formData.name, formData.phone, formData.address, formData.area, cart?.id]);
    const trackingKey = useMemo(() => {
        if (!canTrackIncomplete) return '';
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
    // Use subtotal (without shipping) for InitiateCheckout — shipping may not be selected yet
    const initiateCheckoutTrackKey = useMemo(
        () => `${cartItemContentIds.join(',')}|${Number(subtotal || 0).toFixed(2)}|${totalQuantity}`,
        [cartItemContentIds, subtotal, totalQuantity]
    );

    const handleQty = async (itemId, nextQty) => {
        if (nextQty < 1) return;
        try {
            await updateCartItem({ id: itemId, quantity: nextQty }).unwrap();
        } catch (error) {
            console.error('Update cart error:', error);
        }
    };

    const handleRemove = async (itemId) => {
        try {
            await deleteCartItem(itemId).unwrap();
        } catch (error) {
            console.error('Remove cart error:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
                console.error('Incomplete order auto-track failed:', error);
            }
        }, 900);

        return () => window.clearTimeout(timeoutId);
    }, [canTrackIncomplete, trackingKey, trackingPayload, trackIncompleteOrder]);

    useEffect(() => {
        if (!canTrackIncomplete || !trackingKey) return undefined;
        if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

        const flushIncompleteWithBeacon = () => {
            if (lastTrackedKeyRef.current === trackingKey) return;
            if (!navigator.sendBeacon) return;

            const apiBase = String(process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
            if (!apiBase) return;

            const payload = {
                ...trackingPayload,
                cart_id: trackingPayload.cart_id || window.localStorage.getItem('cart_id') || null,
            };
            const body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            const sent = navigator.sendBeacon(`${apiBase}/api/v1/incomplete-orders/track`, body);

            if (sent) {
                lastTrackedKeyRef.current = trackingKey;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushIncompleteWithBeacon();
            }
        };

        window.addEventListener('beforeunload', flushIncompleteWithBeacon);
        window.addEventListener('pagehide', flushIncompleteWithBeacon);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', flushIncompleteWithBeacon);
            window.removeEventListener('pagehide', flushIncompleteWithBeacon);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [canTrackIncomplete, trackingKey, trackingPayload]);

    // Fire InitiateCheckout once pixel is initialized (wait for PixelCodeInjector to run fbq('init'))
    useEffect(() => {
        if (!items.length || !initiateCheckoutTrackKey) return;
        if (initiateCheckoutTrackedRef.current === initiateCheckoutTrackKey) return;

        let attempts = 0;
        const MAX_ATTEMPTS = 34; // ~10 seconds (34 × 300ms)

        const tryFireEvent = () => {
            attempts++;
            if (!hasInitializedPixel()) {
                // Pixel not yet initialized by PixelCodeInjector — keep waiting
                if (attempts < MAX_ATTEMPTS) return;
                // Timed out — fire anyway using stub queue (best-effort)
            }

            // Pixel is ready (or timed out) — fire the event
            if (initiateCheckoutTrackedRef.current !== initiateCheckoutTrackKey) {
                trackFacebookInitiateCheckout({
                    itemIds: cartItemContentIds,
                    value: subtotal,
                    quantity: totalQuantity,
                    currency: 'BDT',
                });
                initiateCheckoutTrackedRef.current = initiateCheckoutTrackKey;
            }
            clearInterval(intervalId);
        };

        const intervalId = setInterval(tryFireEvent, 300);
        tryFireEvent(); // also try immediately

        return () => clearInterval(intervalId);
    }, [initiateCheckoutTrackKey, items.length, cartItemContentIds, subtotal, totalQuantity]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!shippingChargeIds.length) {
            const message = 'No delivery area is available right now.';
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
                showErrorMessage('Please provide valid checkout information.');
            }
            return;
        }

        try {
            const response = await checkoutMutation({
                ...formData,
                district: 64,
            }).unwrap();

            // Assuming response contains order_id or id. Adjust based on API response structure.
            // The CheckoutController returns: { success: true, message: '...', order_id: ... }
            if (response?.order_id) {
                trackFacebookPurchase({
                    orderId: response.order_id,
                    itemIds: cartItemContentIds,
                    value: total,
                    quantity: totalQuantity,
                });
                lastTrackedKeyRef.current = '';
                navigate('/order-success');
            } else {
                showErrorMessage('Order was placed but order ID was not returned.');
                navigate('/');
            }
        } catch (error) {
            const serverErrors =
                error?.data?.errors && typeof error.data.errors === 'object'
                    ? error.data.errors
                    : {};
            const errorEntries = Object.entries(serverErrors);
            const nextErrors = {};
            errorEntries.forEach(([field, messages]) => {
                const firstMessage = Array.isArray(messages) ? messages[0] : messages;
                if (typeof firstMessage === 'string' && firstMessage.trim()) {
                    nextErrors[field] = firstMessage.trim();
                }
            });

            if (Object.keys(nextErrors).length > 0) {
                setFormErrors((prev) => ({ ...prev, ...nextErrors }));
            }

            const areaMessage =
                (typeof nextErrors.area === 'string' && nextErrors.area) ||
                (Array.isArray(serverErrors.area) ? serverErrors.area[0] : null);
            const fallbackMessage =
                areaMessage ||
                error?.data?.message ||
                'Failed to confirm order.';
            showErrorMessage(fallbackMessage);
        }
    };

    const isInitialCartLoad = cartLoading && !cart;
    const isInitialShippingLoad = shippingLoading && !shippingResponse;

    const primaryColor = setting?.button_primary_color || '#10b981';
    const secondaryColor = setting?.button_secondary_color || '#059669';

    if (isInitialCartLoad || isInitialShippingLoad) {
        return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Loading...</div>;
    }

    if (!items.length) {
        return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Cart is empty</div>;
    }

    return (
        <div className="bg-[#f9fafb] min-h-screen">
            <div className="max-w-[1200px] mx-auto px-4 py-8 lg:py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row gap-8 items-start"
                >
                    {/* Left Column: Form Section */}
                    <div className="flex-1 w-full space-y-6">
                        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-brand-50 rounded-xl text-brand-600">
                                    <FiInfo size={24} />
                                </div>
                                <div>
                                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Delivery Information</h1>
                                    <p className="text-sm text-gray-500 mt-1">Fill in details for quick delivery</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <FiUser className="text-gray-400" /> Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="John Doe"
                                            aria-invalid={Boolean(formErrors.name)}
                                            className={`w-full rounded-xl px-4 py-3 text-sm transition-all outline-none ${formErrors.name
                                                    ? 'border border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                                    : 'border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
                                                }`}
                                        />
                                        {formErrors.name ? (
                                            <p className="text-xs font-medium text-red-600">{formErrors.name}</p>
                                        ) : null}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <FiPhone className="text-gray-400" /> Mobile Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="01XXXXXXXXX"
                                            aria-invalid={Boolean(formErrors.phone)}
                                            className={`w-full rounded-xl px-4 py-3 text-sm transition-all outline-none ${formErrors.phone
                                                    ? 'border border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                                    : 'border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
                                                }`}
                                        />
                                        {formErrors.phone ? (
                                            <p className="text-xs font-medium text-red-600">{formErrors.phone}</p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FiMapPin className="text-gray-400" /> Full Address <span className="text-red-500">*</span>
                                        <span className="text-xs font-normal text-gray-400">(House, Road, Area)</span>
                                    </label>
                                    <textarea
                                        name="address"
                                        rows="3"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Enter your detailed address"
                                        aria-invalid={Boolean(formErrors.address)}
                                        className={`w-full rounded-xl px-4 py-3 text-sm transition-all outline-none resize-none ${formErrors.address
                                                ? 'border border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                                : 'border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
                                            }`}
                                    />
                                    {formErrors.address ? (
                                        <p className="text-xs font-medium text-red-600">{formErrors.address}</p>
                                    ) : null}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FiMapPin className="text-brand-500" /> Delivery Area <span className="text-red-500">*</span>
                                    </label>
                                    <div
                                        className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl ${formErrors.area ? 'border border-red-200 bg-red-50 p-2' : ''
                                            }`}
                                    >
                                        {shippingCharges.map((charge) => {
                                            const isActive = String(formData.area) === String(charge.id);
                                            return (
                                                <label
                                                    key={charge.id}
                                                    style={{
                                                        borderColor: isActive ? primaryColor : undefined,
                                                        backgroundColor: isActive ? `${primaryColor}10` : undefined,
                                                        boxShadow: isActive ? `0 0 0 4px ${primaryColor}10` : undefined,
                                                    }}
                                                    className={`relative flex items-center justify-between gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${!isActive ? 'border-gray-100 bg-white hover:border-gray-200' : ''
                                                        }`}
                                                >
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
                                                            style={{ color: isActive ? primaryColor : undefined }}
                                                            className={`text-sm font-bold ${!isActive ? 'text-gray-700' : ''}`}
                                                        >
                                                            {charge.name}
                                                        </span>
                                                    </div>
                                                    <span
                                                        style={{ color: isActive ? primaryColor : undefined }}
                                                        className={`text-sm font-medium ${!isActive ? 'text-gray-500' : ''}`}
                                                    >
                                                        ৳{charge.amount}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {formErrors.area ? (
                                        <p className="text-xs font-medium text-red-600">{formErrors.area}</p>
                                    ) : null}
                                </div>

                                <div className="pt-4 lg:hidden">
                                    <button
                                        type="submit"
                                        style={{ backgroundColor: primaryColor }}
                                        className="w-full text-white py-4 rounded-xl font-bold transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 hover:brightness-95"
                                    >
                                        Confirm Order • ৳{total}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>

                    {/* Right Column: Order Summary Section */}
                    <div className="w-full lg:w-[420px] sticky top-8 space-y-6">
                        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <FiShoppingBag className="text-brand-500" /> Order Summary
                                    </h2>
                                    <span className="px-2.5 py-1 bg-brand-50 text-brand-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                                        {items.length} {items.length === 1 ? 'Item' : 'Items'}
                                    </span>
                                </div>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 no-scrollbar">
                                <AnimatePresence mode="popLayout">
                                    {items.map((item) => {
                                        const productName = item.product_name || item.product?.name || 'Product';
                                        const imageSrc = resolveCheckoutImage(item);
                                        const lineTotal = Number(item.price) * item.quantity;

                                        return (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                key={item.id}
                                                className="flex gap-4 group"
                                            >
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
                                                            title="Remove Item"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>

                                                    {item.options?.product_size && (
                                                        <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                                                            {item.options.product_size} • {item.options.product_color}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between mt-3">
                                                        <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQty(item.id, item.quantity - 1)}
                                                                style={{ color: primaryColor }}
                                                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-white rounded transition-all shadow-none hover:shadow-sm"
                                                            >
                                                                <FiMinus size={12} />
                                                            </button>
                                                            <span className="w-8 text-center text-[12px] font-bold text-gray-700">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQty(item.id, item.quantity + 1)}
                                                                style={{ color: primaryColor }}
                                                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-white rounded transition-all shadow-none hover:shadow-sm"
                                                            >
                                                                <FiPlus size={12} />
                                                            </button>
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            ৳{lineTotal}
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
                                    <span className="font-semibold text-gray-900">৳{subtotal}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500 pb-1">
                                    <span>Shipping</span>
                                    <span className="font-semibold text-gray-900">৳{shippingCost}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                    <span className="text-base font-bold text-gray-900">Total Payable</span>
                                    <span style={{ color: primaryColor }} className="text-xl font-black">৳{total}</span>
                                </div>
                            </div>

                            <div className="p-6 pt-0">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }}
                                    style={{ backgroundColor: primaryColor }}
                                    className="hidden lg:flex w-full text-white py-4 rounded-xl font-bold transition-all transform active:scale-[0.98] items-center justify-center gap-2 group shadow-lg hover:brightness-95"
                                >
                                    Confirm Order
                                    <motion.div
                                        animate={{ x: [0, 4, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
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
