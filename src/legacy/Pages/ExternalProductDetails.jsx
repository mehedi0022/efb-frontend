import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useAddExternalToCartMutation, useGetExternalProductQuery } from '../store/publicApi';
import ProductDetailView from '../components/ProductDetailView';
import { showSmartSuccessToast } from '../admin/utils/alerts';
import {
    normalizeExternalProductSlug,
    resolveExternalProductSlug,
    toExternalProductPath,
} from '../utils/externalProduct';
import { resolveBrowserTabTitle } from '../utils/tabTitle';
import { trackEvent } from '@/lib/pixel';

const IMAGE_BASE = process.env.NEXT_PUBLIC_EXTERNAL_IMAGE_BASE || 'https://freelancerbangladesh.com/';
const FALLBACK_CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '01700-000000';
const FALLBACK_WHATSAPP_PHONE = process.env.NEXT_PUBLIC_NOGOD_PHONE || FALLBACK_CONTACT_PHONE;
const FALLBACK_MESSENGER_URL = process.env.NEXT_PUBLIC_MESSENGER_URL || '';

const PLACEHOLDER_IMAGE = 'https://placehold.co/900x900?text=Product';

const resolveImage = (src) => {
    if (!src) return PLACEHOLDER_IMAGE;
    if (/^https?:\/\//i.test(src)) return src;
    return `${IMAGE_BASE}${String(src).replace(/^\/+/, '')}`;
};

const mapRelatedProducts = (items) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
        const info = item?.product_info || item || {};
        const slug = resolveExternalProductSlug(item);

        return {
            id: item?.id || info?.id || slug,
            slug,
            name: info?.name || item?.name || 'Product',
            price: Number(item?.price ?? info?.price ?? info?.new_price ?? 0),
            oldPrice: item?.previous_price ?? info?.previous_price ?? info?.old_price ?? null,
            image: resolveImage(info?.thumbnail || info?.image || item?.image),
            href: toExternalProductPath(slug),
        };
    });
};

const ExternalProductDetails = () => {
    const { slug: routeSlug } = useParams();
    const slug = useMemo(() => normalizeExternalProductSlug(routeSlug), [routeSlug]);
    const { refreshCart } = useCart();
    const { setting } = useSettings();

    const [qty, setQty] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);
    const trackedViewProductKeyRef = useRef('');

    const [addExternalToCart] = useAddExternalToCartMutation();

    const {
        data: response,
        isLoading,
        isFetching,
        error,
    } = useGetExternalProductQuery(slug, { skip: !slug });

    const data = useMemo(() => {
        if (!response) return null;
        if (response?.success && response?.data) return response.data;
        if (response?.data) return response.data;
        return response;
    }, [response]);
    const siteTitle = resolveBrowserTabTitle(setting);

    useEffect(() => {
        setQty(1);
        setSelectedSize(null);
        setSelectedColor(null);
    }, [slug]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [slug]);

    const productName = data?.productName || data?.name || 'Product';
    const price = Number(data?.price ?? 0);
    const previousPrice = data?.previousPrice ?? data?.previous_price ?? '';
    const sku = data?.sku ?? data?.productSku ?? data?.product_code ?? '';
    const categoryLabel = data?.category_name || data?.categoryName || data?.category?.name || data?.category || '';

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const pageTitle = productName
            ? `${productName} | ${siteTitle}`
            : `Product Details | ${siteTitle}`;
        document.title = pageTitle;
    }, [productName, siteTitle]);

    const sizes = useMemo(() => {
        if (!Array.isArray(data?.sizes)) return [];
        return data.sizes.map((item) => ({
            id: item.id,
            name: item.name || `Size ${item.id}`,
        }));
    }, [data?.sizes]);

    const colors = useMemo(() => {
        if (!Array.isArray(data?.colors)) return [];
        return data.colors.map((item) => ({
            id: item.id,
            name: item.name || `Color ${item.id}`,
        }));
    }, [data?.colors]);

    const images = useMemo(() => {
        if (!data) return [];

        const list = Array.isArray(data.images) ? data.images : [];
        const mapped = list
            .map((img) => resolveImage(img?.imagePath || img?.image || img))
            .filter(Boolean);

        if (mapped.length > 0) return mapped;

        const fallback = resolveImage(data?.image || data?.thumbnail);
        return [fallback || PLACEHOLDER_IMAGE];
    }, [data]);

    const stockRaw = data?.availableStock ?? data?.available_stock ?? data?.stock;
    const hasStockValue = stockRaw !== null && stockRaw !== undefined && stockRaw !== '';
    const availableStock = hasStockValue ? Number(stockRaw) : null;
    const outOfStock = hasStockValue ? Number(availableStock || 0) <= 0 : false;
    const stockText = hasStockValue
        ? (outOfStock ? 'Out of stock' : `In Stock: ${availableStock}`)
        : '';

    const relatedProducts = useMemo(
        () => mapRelatedProducts(data?.related_products || data?.relatedProducts || data?.related || []),
        [data?.related_products, data?.relatedProducts, data?.related]
    );

    const contactConfig = useMemo(() => ({
        hotline: setting?.hotline || FALLBACK_CONTACT_PHONE,
        whatsapp: setting?.whatsapp || setting?.hotline || FALLBACK_WHATSAPP_PHONE,
        messenger: setting?.messenger || FALLBACK_MESSENGER_URL,
    }), [setting?.hotline, setting?.whatsapp, setting?.messenger]);

    useEffect(() => {
        const productId = data?.id || data?.productId || data?.product_id;
        if (!productId) return;

        const trackKey = String(productId);
        if (trackedViewProductKeyRef.current === trackKey) return;

        trackEvent('ViewContent', {
            content_ids: [String(productId)],
            content_type: 'product',
            content_name: productName || undefined,
            value: Number(price) || 0,
            currency: 'BDT',
            num_items: 1,
        });

        trackedViewProductKeyRef.current = trackKey;
    }, [data?.id, data?.productId, data?.product_id, productName, price]);

    const buildExternalPayload = () => {
        const sizeObj = sizes.find((item) => String(item.id) === String(selectedSize));
        const colorObj = colors.find((item) => String(item.id) === String(selectedColor));
        const externalProductId = data?.id || data?.productId || data?.product_id || sku || slug;

        return {
            external_product_id: String(externalProductId),
            product_name: productName,
            product_image: images[0] || '',
            price: Number(price) || 0,
            quantity: qty,
            options: {
                size_id: sizeObj?.id || null,
                size_name: sizeObj?.name || null,
                color_id: colorObj?.id || null,
                color_name: colorObj?.name || null,
                product_size: sizeObj?.name || null,
                product_color: colorObj?.name || null,
                size: sizeObj?.name || null,
                color: colorObj?.name || null,
                sku: sku || null,
            },
        };
    };

    const handleAddToCart = async (redirectToCheckout = false) => {
        try {
            const payload = buildExternalPayload();
            await addExternalToCart(payload).unwrap();
            await refreshCart();

            const trackingProductId =
                data?.id || data?.productId || data?.product_id || null;

            if (trackingProductId) {
                trackEvent('AddToCart', {
                    content_ids: [String(trackingProductId)],
                    content_type: 'product',
                    content_name: productName || undefined,
                    value: (Number(price) || 0) * (Number(qty) || 1),
                    currency: 'BDT',
                    num_items: Number(qty) || 1,
                });
            }

            if (redirectToCheckout) {
                window.location.href = '/checkout';
                return;
            }

            showSmartSuccessToast('Product successfully added to cart');
        } catch (requestError) {
            console.error('External add to cart failed', requestError);
            alert('Failed to add to cart.');
        }
    };

    return (
        <ProductDetailView
            loading={isLoading || isFetching}
            error={error}
            product={{
                id: data?.id || slug,
                slug,
                name: productName,
                sku,
            }}
            images={images}
            price={price}
            previousPrice={previousPrice}
            categoryLabel={categoryLabel}
            outOfStock={outOfStock}
            stockText={stockText}
            sizes={sizes}
            colors={colors}
            selectedSize={selectedSize}
            selectedColor={selectedColor}
            qty={qty}
            onSelectSize={setSelectedSize}
            onSelectColor={setSelectedColor}
            onDecreaseQty={() => setQty((prev) => Math.max(1, prev - 1))}
            onIncreaseQty={() => setQty((prev) => prev + 1)}
            onBuyNow={() => handleAddToCart(true)}
            onAddToCart={() => handleAddToCart(false)}
            descriptionHtml={data?.description || ''}
            tabContent={{
                reviews: data?.reviews || '',
                return: data?.return_policy || '',
                delivery: data?.delivery_policy || '',
            }}
            youtubeVideoUrl={data?.youtube_video_url || data?.youtube_url || data?.video_url || ''}
            facebookVideoUrl={data?.facebook_video_url || data?.facebook_video || ''}
            videoId={data?.pro_video || data?.video_id || ''}
            relatedProducts={relatedProducts}
            relatedTitle="Related Products"
            contact={contactConfig}
        />
    );
};

export default ExternalProductDetails;
