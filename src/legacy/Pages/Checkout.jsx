import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import {
    useCheckoutMutation,
    useDeleteCartItemMutation,
    useGetCartQuery,
    useGetShippingChargesQuery,
    useTrackIncompleteOrderMutation,
    useUpdateCartItemMutation,
} from '../store/publicApi';
import { resolveMediaUrl } from '../utils/media';

const Checkout = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        area: '',
        payment_method: 'Cash On Delivery',
    });
    const { data: cart, isLoading: cartLoading } = useGetCartQuery();
    const {
        data: shippingResponse,
        isLoading: shippingLoading,
    } = useGetShippingChargesQuery();
    const [updateCartItem] = useUpdateCartItemMutation();
    const [deleteCartItem] = useDeleteCartItemMutation();
    const [checkoutMutation] = useCheckoutMutation();
    const [trackIncompleteOrder] = useTrackIncompleteOrderMutation();
    const navigate = useNavigate();
    const lastTrackedKeyRef = useRef('');

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


    useEffect(() => {
        if (!formData.area && shippingCharges.length) {
            setFormData((prev) => ({ ...prev, area: shippingCharges[0].id }));
        }
    }, [formData.area, shippingCharges]);

    const items = cart?.items || [];

    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    }, [items]);

    const shippingCost = useMemo(() => {
        const charge = shippingCharges.find((c) => String(c.id) === String(formData.area));
        return charge ? Number(charge.amount) : 0;
    }, [shippingCharges, formData.area]);

    const total = subtotal + shippingCost;
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
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await checkoutMutation({
                ...formData,
                district: 64,
            }).unwrap();

            // Assuming response contains order_id or id. Adjust based on API response structure.
            // The CheckoutController returns: { success: true, message: '...', order_id: ... }
            if (response?.order_id) {
                lastTrackedKeyRef.current = '';
                navigate('/order-success');
            } else {
                alert('Order was placed but order ID was not returned.');
                navigate('/');
            }
        } catch (error) {
            alert('Failed to confirm order.');
        }
    };

    const isInitialCartLoad = cartLoading && !cart;
    const isInitialShippingLoad = shippingLoading && !shippingResponse;

    if (isInitialCartLoad || isInitialShippingLoad) {
        return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Loading...</div>;
    }

    if (!items.length) {
        return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Cart is empty</div>;
    }

    return (
        <div className="bg-gray-100">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <p className="text-center text-sm text-gray-600 mb-6">
                            To confirm your order, fill in your name, mobile number, and address, then click
                            <span className="text-red-600 font-semibold"> Confirm Order</span>.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name *</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your name"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number *</label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter your mobile number"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Address *</label>
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter your full address"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Courier Charge</label>
                                <div className="space-y-2">
                                    {shippingCharges.map((charge) => (
                                        <label
                                            key={charge.id}
                                            className={`flex items-center gap-2 px-4 py-2 rounded border cursor-pointer ${String(formData.area) === String(charge.id) ? 'bg-green-600 text-white border-green-600' : 'bg-gray-200 border-gray-200'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="area"
                                                value={charge.id}
                                                checked={String(formData.area) === String(charge.id)}
                                                onChange={handleChange}
                                            />
                                            <span className="text-sm font-semibold">{charge.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-black text-white py-3 rounded font-semibold"
                            >
                                Confirm Order
                            </button>
                        </form>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="md:hidden">
                            {items.map((item) => {
                                const productName = item.product_name || item.product?.name || 'Product';
                                const imageSrc = resolveCheckoutImage(item);
                                const lineTotal = Number(item.price) * item.quantity;
                                return (
                                    <div key={item.id} className="border-b p-4">
                                        <p className="mb-3 break-words text-sm font-semibold leading-5 text-gray-900">
                                            {productName}
                                        </p>
                                        <div className="flex items-start gap-3">
                                            <img src={imageSrc} alt={productName} className="h-14 w-14 rounded border object-cover" />
                                            <div className="flex-1 space-y-2">
                                                {item.options?.product_size ? (
                                                    <p className="break-words text-xs text-gray-500">
                                                        {item.options.product_size}, {item.options.product_color}
                                                    </p>
                                                ) : null}
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Price</span>
                                                    <span className="font-medium text-gray-800">{Number(item.price)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Quantity</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQty(item.id, item.quantity - 1)}
                                                            className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white"
                                                        >
                                                            <FiMinus />
                                                        </button>
                                                        <input
                                                            value={item.quantity}
                                                            readOnly
                                                            className="h-8 w-10 rounded border border-gray-300 text-center"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQty(item.id, item.quantity + 1)}
                                                            className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white"
                                                        >
                                                            <FiPlus />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Total</span>
                                                    <span className="font-semibold text-gray-900">{lineTotal}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(item.id)}
                                                className="text-red-500"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="bg-gray-50 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Sub-Total</span>
                                    <span className="font-semibold">{subtotal}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span>Delivery Charges</span>
                                    <span className="font-semibold">{shippingCost}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-base font-bold text-emerald-600">
                                    <span>Total Amount</span>
                                    <span>{total}</span>
                                </div>
                            </div>
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-white border-b">
                                    <tr className="text-left">
                                        <th className="p-3 font-semibold">Product</th>
                                        <th className="p-3 font-semibold">Price</th>
                                        <th className="p-3 font-semibold">Qty</th>
                                        <th className="p-3 font-semibold">Total</th>
                                        <th className="p-3 font-semibold"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => {
                                        const productName = item.product_name || item.product?.name || 'Product';
                                        const imageSrc = resolveCheckoutImage(item);
                                        const lineTotal = Number(item.price) * item.quantity;
                                        return (
                                            <tr key={item.id} className="border-b">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <img src={imageSrc} alt={productName} className="h-11 w-11 rounded border object-cover" />
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{productName}</p>
                                                            {item.options?.product_size && (
                                                                <p className="text-xs text-gray-500">{item.options.product_size}, {item.options.product_color}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">{Number(item.price)}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQty(item.id, item.quantity - 1)}
                                                            className="h-8 w-8 rounded bg-blue-600 text-white flex items-center justify-center"
                                                        >
                                                            <FiMinus />
                                                        </button>
                                                        <input
                                                            value={item.quantity}
                                                            readOnly
                                                            className="w-10 h-8 border border-gray-300 text-center rounded"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQty(item.id, item.quantity + 1)}
                                                            className="h-8 w-8 rounded bg-blue-600 text-white flex items-center justify-center"
                                                        >
                                                            <FiPlus />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-3 font-semibold">{lineTotal}</td>
                                                <td className="p-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemove(item.id)}
                                                        className="text-red-500"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t">
                                        <th colSpan="3" className="p-3 text-right">Sub-Total</th>
                                        <td colSpan="2" className="p-3 font-semibold">{subtotal}</td>
                                    </tr>
                                    <tr>
                                        <th colSpan="3" className="p-3 text-right">Delivery Charges</th>
                                        <td colSpan="2" className="p-3 font-semibold">{shippingCost}</td>
                                    </tr>
                                    <tr>
                                        <th colSpan="3" className="p-3 text-right text-emerald-600">Total Amount</th>
                                        <td colSpan="2" className="p-3 font-bold text-emerald-600">{total}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
