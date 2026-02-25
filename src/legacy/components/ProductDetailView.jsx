import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FiChevronLeft,
    FiChevronRight,
    FiMapPin,
    FiMinus,
    FiPackage,
    FiPhoneCall,
    FiPlus,
    FiShoppingBag,
} from 'react-icons/fi';
import { FaFacebookMessenger, FaWhatsapp } from 'react-icons/fa';
import { Tag } from 'antd';
import { useGetShippingChargesQuery } from '../store/publicApi';

const DEFAULT_TABS = [
    { key: 'description', label: 'Description' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'return', label: 'Return Policy' },
    // { key: 'delivery', label: 'Delivery Policy' },
];

const fallbackTabContent = {
    reviews: 'No reviews available for this product yet.',
    return: 'Return policy is not available.',
    // delivery: 'Delivery policy is not available.',
};

const normalizeHtml = (value) => {
    if (typeof value !== 'string') return '';

    return value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
};

const toDigits = (value) => String(value || '').replace(/\D/g, '');

const toBdIntlPhone = (value) => {
    const digits = toDigits(value);
    if (!digits) return '';
    if (digits.startsWith('880')) return digits;
    if (digits.startsWith('0')) return `880${digits.slice(1)}`;
    return digits;
};

const normalizeExternalUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw || raw === '#') return '#';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, '')}`;
};

const ensureUrlWithScheme = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, '')}`;
};

const extractYoutubeVideoId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
        return raw;
    }

    const candidateUrl = ensureUrlWithScheme(raw);

    try {
        const url = new URL(candidateUrl);
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        const parts = url.pathname.split('/').filter(Boolean);

        if (host === 'youtu.be') {
            return /^[A-Za-z0-9_-]{11}$/.test(parts[0] || '') ? parts[0] : '';
        }

        const isYoutubeHost = host === 'youtube.com'
            || host.endsWith('.youtube.com')
            || host === 'youtube-nocookie.com'
            || host.endsWith('.youtube-nocookie.com');
        if (!isYoutubeHost) {
            return '';
        }

        let videoId = '';

        if (parts[0] === 'watch') {
            videoId = url.searchParams.get('v') || '';
        } else if (parts[0] === 'embed' || parts[0] === 'shorts') {
            videoId = parts[1] || '';
        }

        return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : '';
    } catch (_error) {
        return '';
    }
};

const resolveYoutubeEmbedUrl = (value) => {
    const videoId = extractYoutubeVideoId(value);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
};

const resolveFacebookEmbedUrl = (value) => {
    const normalizedUrl = ensureUrlWithScheme(value);
    if (!normalizedUrl) return '';

    try {
        const url = new URL(normalizedUrl);
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        const isFacebookHost = host === 'facebook.com'
            || host.endsWith('.facebook.com')
            || host === 'fb.watch';

        if (!isFacebookHost) {
            return '';
        }

        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalizedUrl)}&show_text=false&width=1280`;
    } catch (_error) {
        return '';
    }
};

const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return value || 0;
    return new Intl.NumberFormat('en-BD').format(Math.round(amount));
};

const resolveThumbsPerView = (width) => {
    if (width < 640) return 4;
    if (width < 1024) return 6;
    return 7;
};

const RelatedProductCard = ({ product }) => {
    const image = product.image || 'https://placehold.co/480x480?text=Product';
    const title = product.name || 'Product';
    const href = product.href || `/products/${product.slug}`;

    return (
        <Link
            to={href}
            className="group rounded-xl border border-gray-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md"
        >
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img
                    src={image}
                    alt={title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                />
            </div>
            <h4 className="mt-3 line-clamp-2 text-sm font-semibold text-gray-800">{title}</h4>
            <div className="mt-2 flex items-center gap-2">
                {product.oldPrice ? (
                    <span className="text-xs text-gray-400 line-through">৳{product.oldPrice}</span>
                ) : null}
                <span className="text-sm font-bold text-gray-900">৳{product.price ?? 0}</span>
            </div>
        </Link>
    );
};

const ProductDetailView = ({
    loading = false,
    error = null,
    product = {},
    images = [],
    price,
    previousPrice,
    categoryLabel = '',
    outOfStock = false,
    stockText = '',
    sizes = [],
    colors = [],
    selectedSize = null,
    selectedColor = null,
    qty = 1,
    onSelectSize,
    onSelectColor,
    onDecreaseQty,
    onIncreaseQty,
    onBuyNow,
    onAddToCart,
    tabs = DEFAULT_TABS,
    descriptionHtml = '',
    tabContent = {},
    youtubeVideoUrl = '',
    facebookVideoUrl = '',
    videoId = '',
    relatedProducts = [],
    relatedTitle = 'Related Products',
    contact = {},
}) => {
    const {
        data: shippingResponse,
        isLoading: shippingLoading,
        isFetching: shippingFetching,
    } = useGetShippingChargesQuery();

    const [activeImage, setActiveImage] = useState(0);
    const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'description');
    const [isSliderPaused, setIsSliderPaused] = useState(false);
    const [thumbStartIndex, setThumbStartIndex] = useState(0);
    const [thumbsPerView, setThumbsPerView] = useState(6);

    const gallery = useMemo(() => {
        if (Array.isArray(images) && images.length) return images;
        return ['https://placehold.co/900x900?text=Product'];
    }, [images]);
    const hasMultipleImages = gallery.length > 1;
    const maxThumbStartIndex = Math.max(0, gallery.length - thumbsPerView);
    const visibleThumbs = gallery.slice(thumbStartIndex, thumbStartIndex + thumbsPerView);

    const currentPrice = Number(price);
    const oldPrice = Number(previousPrice);
    const productSku = String(product?.sku || '').trim();
    const discountAmount = Number.isFinite(oldPrice) && Number.isFinite(currentPrice) && oldPrice > currentPrice
        ? oldPrice - currentPrice
        : 0;
    const discountPercent = discountAmount > 0 && oldPrice > 0
        ? Math.round((discountAmount / oldPrice) * 100)
        : 0;

    const hotline = contact.hotline || contact.phone || '01791763023';
    const whatsappLabel = contact.whatsapp || hotline;

    const hotlineHref = toDigits(hotline) ? `tel:${toDigits(hotline)}` : '#';
    const whatsappNumber = toBdIntlPhone(contact.whatsapp || hotline);
    const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#';

    const messengerHref = normalizeExternalUrl(contact.messenger);
    const youtubeEmbedUrl = useMemo(
        () => resolveYoutubeEmbedUrl(youtubeVideoUrl || videoId),
        [youtubeVideoUrl, videoId]
    );
    const facebookEmbedUrl = useMemo(
        () => resolveFacebookEmbedUrl(facebookVideoUrl),
        [facebookVideoUrl]
    );
    const videoEmbedUrl = youtubeEmbedUrl || facebookEmbedUrl;
    const videoSourceLabel = youtubeEmbedUrl ? 'YouTube' : (facebookEmbedUrl ? 'Facebook' : '');
    const shippingCharges = useMemo(() => {
        const rows = Array.isArray(shippingResponse?.data) ? shippingResponse.data : [];

        return rows.filter((row) => {
            const status = Number(row?.status ?? 1);
            const frontView = row?.front_view;
            const showOnFront = frontView === null || frontView === undefined || Number(frontView) === 1;

            return status === 1 && showOnFront;
        });
    }, [shippingResponse?.data]);

    useEffect(() => {
        if (activeImage > gallery.length - 1) {
            setActiveImage(0);
        }
    }, [gallery.length, activeImage]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleResize = () => {
            setThumbsPerView(resolveThumbsPerView(window.innerWidth));
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!hasMultipleImages || isSliderPaused) return undefined;

        const sliderInterval = window.setInterval(() => {
            setActiveImage((prev) => (prev + 1) % gallery.length);
        }, 4000);

        return () => window.clearInterval(sliderInterval);
    }, [gallery.length, hasMultipleImages, isSliderPaused]);

    useEffect(() => {
        setActiveImage(0);
        setActiveTab(tabs[0]?.key || 'description');
        setThumbStartIndex(0);
    }, [product.id, product.slug, tabs]);

    useEffect(() => {
        if (thumbStartIndex > maxThumbStartIndex) {
            setThumbStartIndex(maxThumbStartIndex);
        }
    }, [thumbStartIndex, maxThumbStartIndex]);

    useEffect(() => {
        if (activeImage < thumbStartIndex) {
            setThumbStartIndex(activeImage);
            return;
        }

        const endIndex = thumbStartIndex + thumbsPerView - 1;
        if (activeImage > endIndex) {
            setThumbStartIndex(Math.min(activeImage - thumbsPerView + 1, maxThumbStartIndex));
        }
    }, [activeImage, thumbStartIndex, thumbsPerView, maxThumbStartIndex]);

    const renderTabContent = () => {
        const description = normalizeHtml(descriptionHtml);

        if (activeTab === 'description') {
            if (!description) {
                return <p>Product details will be added soon.</p>;
            }
            return <div dangerouslySetInnerHTML={{ __html: description }} />;
        }

        const html = normalizeHtml(tabContent[activeTab]);

        if (html) {
            return <div dangerouslySetInnerHTML={{ __html: html }} />;
        }

        return <p>{fallbackTabContent[activeTab] || 'Information not found.'}</p>;
    };

    const goToPreviousImage = () => {
        setActiveImage((prev) => (prev - 1 + gallery.length) % gallery.length);
    };

    const goToNextImage = () => {
        setActiveImage((prev) => (prev + 1) % gallery.length);
    };

    const goToPreviousThumbs = () => {
        setThumbStartIndex((prev) => Math.max(0, prev - 1));
    };

    const goToNextThumbs = () => {
        setThumbStartIndex((prev) => Math.min(maxThumbStartIndex, prev + 1));
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-10">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="h-[520px] rounded-2xl bg-white animate-pulse" />
                    <div className="h-[520px] rounded-2xl bg-white animate-pulse" />
                </div>
            </div>
        );
    }

    if (error || !product?.name) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-12 text-center">
                <div className="rounded-xl bg-white p-10 shadow-sm">
                    <p className="font-semibold text-red-600">Failed to load product details.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#edf1f7]">
            <div className="mx-auto max-w-[1120px] px-3 py-4 md:py-5">
                <div className="grid grid-cols-1 gap-3 lg:auto-rows-auto lg:grid-cols-[minmax(0,1fr)_640px] lg:items-start">
                    <div className="min-w-0 self-start">
                        <div className="rounded-2xl border border-[#d7dee9] bg-[#f3f6fb] p-2 shadow-sm">
                            <div
                                className="relative overflow-hidden rounded-xl bg-[#efe3d9]"
                                onMouseEnter={() => setIsSliderPaused(true)}
                                onMouseLeave={() => setIsSliderPaused(false)}
                            >
                                <img
                                    src={gallery[activeImage]}
                                    alt={product.name}
                                    className="h-[260px] w-full object-cover transition duration-500 sm:h-[420px] lg:h-[500px]"
                                />

                                {hasMultipleImages ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={goToPreviousImage}
                                            className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70"
                                            aria-label="Previous image"
                                        >
                                            <FiChevronLeft />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={goToNextImage}
                                            className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70"
                                            aria-label="Next image"
                                        >
                                            <FiChevronRight />
                                        </button>
                                    </>
                                ) : null}

                                {hasMultipleImages ? (
                                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">
                                        {gallery.map((_, idx) => (
                                            <button
                                                key={`dot-${idx}`}
                                                type="button"
                                                onClick={() => setActiveImage(idx)}
                                                className={`h-1.5 rounded-full transition ${
                                                    idx === activeImage ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
                                                }`}
                                                aria-label={`Go to image ${idx + 1}`}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-2 rounded-xl border border-[#d7dee9] bg-[#f3f6fb] p-2">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={goToPreviousThumbs}
                                    disabled={thumbStartIndex <= 0}
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white text-gray-600 shadow-sm disabled:opacity-40"
                                    aria-label="Previous thumbnails"
                                >
                                    <FiChevronLeft className="text-sm" />
                                </button>

                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
                                        {visibleThumbs.map((img, idx) => {
                                            const imageIndex = thumbStartIndex + idx;
                                            return (
                                                <button
                                                    key={`${img}-${imageIndex}`}
                                                    type="button"
                                                    onClick={() => setActiveImage(imageIndex)}
                                                    className={`aspect-square overflow-hidden rounded-md border bg-white p-0.5 transition ${
                                                        imageIndex === activeImage ? 'border-blue-500 ring-1 ring-blue-300' : 'border-gray-300'
                                                    }`}
                                                >
                                                    <img src={img} alt="Thumbnail" className="h-full w-full rounded object-cover" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={goToNextThumbs}
                                    disabled={thumbStartIndex >= maxThumbStartIndex}
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white text-gray-600 shadow-sm disabled:opacity-40"
                                    aria-label="Next thumbnails"
                                >
                                    <FiChevronRight className="text-sm" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0 w-full max-w-full self-start rounded-2xl border border-[#d7dee9] bg-white p-3 shadow-sm md:p-4 lg:h-auto lg:w-[640px]">
                        <h1 className="text-[18px] font-bold leading-tight text-[#161f2d] md:text-[24px] md:leading-[1.25]">
                            {product.name}
                        </h1>

                        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
                            <span className="text-[18px] font-extrabold leading-none text-[#111827] sm:text-[20px] md:text-[24px]">
                                TK. {formatMoney(price)}
                            </span>
                            {discountAmount > 0 ? (
                                <span className="text-[17px] font-bold leading-none text-[#fca5a5] line-through sm:text-[19px] md:text-[22px]">
                                    TK. {formatMoney(oldPrice)}
                                </span>
                            ) : null}
                            {discountAmount > 0 ? (
                                <span className="text-xs font-semibold leading-tight text-[#43a047] sm:text-sm">
                                    You Save TK. {formatMoney(discountAmount)} ({discountPercent}%)
                                </span>
                            ) : null}
                        </div>

                        {stockText ? (
                            <div className="mt-2">
                                <Tag
                                    color={outOfStock ? 'error' : 'success'}
                                    className="!m-0 !rounded-full !border-0 !px-3 !py-1 !text-[13px] !font-semibold"
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <FiPackage className="text-[12px]" />
                                        {stockText}
                                    </span>
                                </Tag>
                            </div>
                        ) : null}

                        {productSku ? (
                            <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#c7d9f2] bg-[#edf4ff] px-3 py-1 text-xs text-[#26436d]">
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#3b5f94]">
                                    SKU
                                </span>
                                <span className="truncate font-extrabold text-[#1f3558]">{productSku}</span>
                            </div>
                        ) : null}

                        {colors.length > 0 ? (
                            <div className="mt-3">
                                <p className="mb-1 text-xs font-semibold text-gray-700">Select Color</p>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => onSelectColor?.(item.id)}
                                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                                String(selectedColor) === String(item.id)
                                                    ? 'border-[#2f3642] bg-[#2f3642] text-white'
                                                    : 'border-gray-300 bg-white text-gray-700'
                                            }`}
                                        >
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {sizes.length > 0 ? (
                            <div className="mt-3">
                                <p className="mb-1 text-xs font-semibold text-gray-700">Select Size</p>
                                <div className="flex flex-wrap gap-2">
                                    {sizes.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => onSelectSize?.(item.id)}
                                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                                String(selectedSize) === String(item.id)
                                                    ? 'border-[#2f3642] bg-[#2f3642] text-white'
                                                    : 'border-gray-300 bg-white text-gray-700'
                                            }`}
                                        >
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d6deeb] bg-[#f7f9fc] px-2 py-1">
                            <button
                                type="button"
                                onClick={onDecreaseQty}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-[#f2f2f2] text-gray-800"
                            >
                                <FiMinus />
                            </button>
                            <input
                                value={qty}
                                readOnly
                                className="w-8 bg-transparent text-center text-lg font-semibold text-gray-900"
                            />
                            <button
                                type="button"
                                onClick={onIncreaseQty}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-[#f2f2f2] text-gray-800"
                            >
                                <FiPlus />
                            </button>
                        </div>

                        <div className="mt-3 space-y-2">
                            <button
                                type="button"
                                disabled={outOfStock}
                                onClick={onBuyNow}
                                className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white transition ${
                                    outOfStock ? 'cursor-not-allowed bg-gray-400' : 'bg-[#222a37] hover:bg-[#111827]'
                                }`}
                            >
                                <FiShoppingBag /> Order Now
                            </button>

                            <button
                                type="button"
                                disabled={outOfStock}
                                onClick={onAddToCart}
                                className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition ${
                                    outOfStock
                                        ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-500'
                                        : 'border-[#2f3642] bg-white text-[#111827] hover:bg-[#f7f8fb]'
                                }`}
                            >
                                <FiShoppingBag /> Add to Cart
                            </button>

                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#28a745] py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1f9a3f]"
                            >
                                <FaWhatsapp className="text-sm" /> WhatsApp Message: {whatsappLabel}
                            </a>

                            <a
                                href={hotlineHref}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2376de] py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1f66bf]"
                            >
                                <FiPhoneCall className="text-sm" /> Hotline: {hotline}
                            </a>

                            <a
                                href={messengerHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0876ff] via-[#9b34e9] to-[#ff5f66] py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
                            >
                                <FaFacebookMessenger className="text-sm" /> Click to Message
                            </a>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Tag className="!m-0 !rounded-full !border !border-[#c9d8f4] !bg-[#f5f8ff] !px-3 !py-1 !text-[11px] !font-semibold !uppercase !tracking-wide !text-[#38507a]">
                                Category
                            </Tag>
                            <Tag className="!m-0 !rounded-full !border-0 !bg-gradient-to-r !from-[#1f3b64] !to-[#365f97] !px-3 !py-1 !text-xs !font-semibold !text-white">
                                {categoryLabel || 'Uncategorized'}
                            </Tag>
                        </div>

                        <div className="mt-2 rounded-xl border border-[#d7e6ff] bg-gradient-to-br from-[#f8fbff] to-[#eef5ff] p-3 text-xs text-[#1f2937] shadow-sm">
                            <div className="space-y-1.5">
                                {shippingCharges.length > 0 ? (
                                    shippingCharges.map((charge, index) => (
                                        <div
                                            key={charge.id || `${charge.name}-${index}`}
                                            className="flex items-center justify-between rounded-lg border border-[#dbe7fb] bg-white px-3 py-2"
                                        >
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#334155]">
                                                <FiMapPin className="text-[13px] text-[#3b82f6]" />
                                                {charge.name || 'Courier Charge'}
                                            </span>
                                            <span className="rounded-full bg-[#edf8ef] px-2.5 py-1 text-xs font-bold text-[#1e7d3d]">
                                                ৳ {formatMoney(charge.amount)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-between rounded-lg border border-[#dbe7fb] bg-white px-3 py-2">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#334155]">
                                            <FiMapPin className="text-[13px] text-[#3b82f6]" />
                                            Courier Charge
                                        </span>
                                        <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-bold text-[#4b5563]">
                                            {shippingLoading || shippingFetching ? 'Loading...' : 'Not set'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 h-auto rounded-xl border border-[#c4cad6] bg-white p-4 shadow-sm md:p-6">
                    <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                                    activeTab === tab.key ? 'bg-[#333945] text-white' : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="product-detail-content prose h-auto max-w-none overflow-visible text-sm leading-7 text-gray-700">{renderTabContent()}</div>
                </div>

                {videoEmbedUrl ? (
                    <div className="mt-6 rounded-xl border border-[#c4cad6] bg-white p-4 shadow-sm md:p-6">
                        <h3 className="mb-3 text-lg font-semibold text-gray-900">Video {videoSourceLabel ? `(${videoSourceLabel})` : ''}</h3>
                        <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200">
                            <iframe
                                className="h-full w-full"
                                src={videoEmbedUrl}
                                title="Product video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                ) : null}

                {relatedProducts.length > 0 ? (
                    <div className="mt-6 rounded-xl border border-[#c4cad6] bg-white p-4 shadow-sm md:p-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">{relatedTitle}</h3>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {relatedProducts.map((item) => (
                                <RelatedProductCard key={item.id || item.slug || item.href} product={item} />
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ProductDetailView;
