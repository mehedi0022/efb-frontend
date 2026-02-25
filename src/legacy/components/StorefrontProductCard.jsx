import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiShoppingBag } from 'react-icons/fi';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAddExternalToCartMutation, useAddToCartMutation } from '../store/publicApi';
import { resolveMediaUrl } from '../utils/media';
import { showSmartSuccessToast } from '../admin/utils/alerts';

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) => {
    const amount = toNumber(value, 0);
    return new Intl.NumberFormat('en-BD').format(Math.round(amount));
};

const clampRating = (value) => {
    const num = toNumber(value, 0);
    return Math.max(0, Math.min(5, num));
};

const resolveCardImage = (source, info, isExternal) => {
    const raw = source?.product_image
        || info?.thumbnail
        || info?.image?.image
        || info?.image
        || info?.imagePath;

    if (!raw) return 'https://placehold.co/600x600?text=Product';

    if (isExternal && /^https?:\/\//i.test(String(raw))) {
        return String(raw);
    }

    return resolveMediaUrl(raw, 'https://placehold.co/600x600?text=Product');
};

const StorefrontProductCard = ({ item, product }) => {
    const source = item || product || {};
    const info = source?.product_info || source || {};
    const { refreshCart } = useCart();
    const [addToCartMutation] = useAddToCartMutation();
    const [addExternalToCartMutation] = useAddExternalToCartMutation();
    const [actionInFlight, setActionInFlight] = useState(null);

    const isExternal = Boolean(source?.product_info || source?.external_product_id);
    const slug = String(info?.slug || source?.slug || '').trim();
    const detailPath = slug ? (isExternal ? `/products/external/${slug}` : `/products/${slug}`) : '/products';
    const name = info?.name || source?.product_name || 'Unnamed product';
    const sku = String(info?.sku || source?.sku || info?.product_code || source?.product_code || '').trim();
    const priceValue = source?.price ?? info?.price ?? info?.selling_price ?? info?.new_price ?? 0;
    const previousPriceValue = source?.previous_price ?? info?.previous_price ?? info?.old_price ?? 0;
    const price = toNumber(priceValue, 0);
    const previousPrice = toNumber(previousPriceValue, 0);
    const discountAmount = previousPrice > price ? previousPrice - price : 0;
    const discountPercent = previousPrice > 0 && discountAmount > 0
        ? Math.round((discountAmount / previousPrice) * 100)
        : 0;
    const rating = clampRating(source?.rating ?? info?.rating ?? 4);
    const stockValueRaw = [
        info?.available_stock,
        source?.available_stock,
        info?.availableStock,
        source?.availableStock,
        source?.stock,
        info?.stock,
        source?.stock_qty,
        info?.stock_qty,
        source?.quantity,
        info?.quantity,
        source?.product_stock,
        info?.product_stock,
    ].find((value) => value !== null && value !== undefined && value !== '');
    const stockValue = stockValueRaw === null || stockValueRaw === undefined || stockValueRaw === ''
        ? null
        : toNumber(stockValueRaw, 0);
    const isOutOfStock = stockValue !== null && stockValue <= 0;
    const imageSrc = useMemo(() => resolveCardImage(source, info, isExternal), [source, info, isExternal]);

    const isBusy = actionInFlight !== null;
    const isOrderNowLoading = actionInFlight === 'order-now';
    const isAddToCartLoading = actionInFlight === 'add-cart';

    const handleAddToCart = async (redirectToCheckout = false) => {
        if (isOutOfStock || isBusy) return;

        const nextAction = redirectToCheckout ? 'order-now' : 'add-cart';
        setActionInFlight(nextAction);
        try {
            if (isExternal) {
                const externalProductId = source?.external_product_id || source?.id || source?.product_id || info?.id || slug;
                await addExternalToCartMutation({
                    external_product_id: String(externalProductId),
                    product_name: name,
                    product_image: imageSrc,
                    price,
                    quantity: 1,
                    options: {
                        size_id: null,
                        size_name: null,
                        color_id: null,
                        color_name: null,
                        product_size: null,
                        product_color: null,
                        size: null,
                        color: null,
                        sku: sku || null,
                    },
                }).unwrap();
            } else {
                await addToCartMutation({
                    product_id: source?.id || info?.id,
                    quantity: 1,
                }).unwrap();
            }

            await refreshCart();

            if (redirectToCheckout) {
                window.location.href = '/checkout';
                return;
            }

            showSmartSuccessToast('Product successfully added to cart');
        } catch (error) {
            const message = error?.data?.errors?.message || error?.data?.message || 'Failed to add cart.';
            window.alert(message);
        } finally {
            setActionInFlight(null);
        }
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-[#dde3ea] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
            <div className="relative p-2.5">
                <Link
                    to={detailPath}
                    className="block overflow-hidden rounded-xl border border-[#ecf0f5] bg-[#f4f7fb]"
                >
                    <img
                        src={imageSrc}
                        alt={name}
                        className="h-44 w-full object-cover sm:h-48"
                        loading="lazy"
                    />
                </Link>

                {discountAmount > 0 ? (
                    <div className="absolute right-[0px] top-[0px] rounded-[0px] rounded-bl-[22px] bg-[#1196af] px-4 py-2 text-sm font-semibold text-white shadow-md">
                        <span>{discountPercent > 0 ? `${discountPercent}% Off` : `${formatMoney(discountAmount)} Off`}</span>
                    </div>
                ) : null}
            </div>

            <div className="px-3 pb-2">
                <Link
                    to={detailPath}
                    className="line-clamp-2 min-h-[2.8rem] text-[15px] font-semibold leading-5 text-[#111827]"
                    title={name}
                >
                    {name}
                </Link>

                <div className="mt-1.5 flex items-center">
                    {Array.from({ length: 5 }).map((_, idx) => {
                        const starValue = idx + 1;
                        const filled = rating >= starValue;
                        return filled ? (
                            <FaStar key={`star-${starValue}`} className="text-[13px] text-[#fbbf24]" />
                        ) : (
                            <FaRegStar key={`star-${starValue}`} className="text-[13px] text-[#fbbf24]" />
                        );
                    })}
                </div>

                {stockValue !== null ? (
                    <div
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isOutOfStock
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                        }`}
                    >
                        <FiPackage className="text-[12px]" />
                        {isOutOfStock ? 'Out of stock' : `In stock: ${stockValue}`}
                    </div>
                ) : null}

                <div className="mt-1.5 flex items-end gap-2">
                    <span className="text-[30px] font-extrabold leading-none text-[#111827]">৳{formatMoney(price)}</span>
                    {previousPrice > 0 ? (
                        <span className="pb-0.5 text-sm font-semibold text-[#ef4444] line-through">৳{formatMoney(previousPrice)}</span>
                    ) : null}
                </div>
            </div>

            <div className="space-y-2 px-2.5 pb-3">
                <button
                    type="button"
                    onClick={() => handleAddToCart(true)}
                    disabled={isOutOfStock || isBusy}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border border-[#22b64f] py-2.5 text-sm font-bold transition ${
                        isOutOfStock
                            ? 'cursor-not-allowed border-gray-300 bg-gray-300 text-gray-600'
                            : isOrderNowLoading
                                ? 'cursor-wait bg-[#22b64f] text-white opacity-90'
                            : 'bg-[#22b64f] text-white hover:brightness-95'
                    }`}
                >
                    <FiShoppingBag className="text-base" />
                    {isOutOfStock ? 'Out of Stock' : (isOrderNowLoading ? 'Processing...' : 'Order Now')}
                </button>

                <button
                    type="button"
                    onClick={() => handleAddToCart(false)}
                    disabled={isOutOfStock || isBusy}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                        isOutOfStock
                            ? 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500'
                            : isAddToCartLoading
                                ? 'cursor-wait border-[#22b64f] bg-[#eafbf1] text-[#111827]'
                            : 'border-[#22b64f] bg-white text-[#111827] hover:bg-[#f5fff8]'
                    }`}
                >
                    <FiShoppingBag className="text-base" />
                    {isAddToCartLoading ? 'Adding...' : 'Add to Cart'}
                </button>
            </div>
        </div>
    );
};

export default StorefrontProductCard;
