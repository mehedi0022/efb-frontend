import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAddToCartMutation, useGetProductBySlugQuery } from '../store/publicApi';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import ProductDetailView from '../components/ProductDetailView';
import { resolveMediaUrl } from '../utils/media';
import { showSmartSuccessToast } from '../admin/utils/alerts';
import { resolveBrowserTabTitle } from '../utils/tabTitle';

const FALLBACK_CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '01700-000000';
const FALLBACK_WHATSAPP_PHONE = process.env.NEXT_PUBLIC_NOGOD_PHONE || FALLBACK_CONTACT_PHONE;
const FALLBACK_MESSENGER_URL = process.env.NEXT_PUBLIC_MESSENGER_URL || '';

const PLACEHOLDER_IMAGE = 'https://placehold.co/900x900?text=Product';

const toSizeName = (item) => item?.size?.sizeName || item?.size?.name || item?.name || 'Size';
const toColorName = (item) => item?.color?.colorName || item?.color?.color || item?.color?.name || item?.name || 'Color';

const mapRelatedProducts = (items) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name || 'Product',
        price: Number(item.new_price ?? item.price ?? 0),
        oldPrice: item.old_price ?? item.previous_price ?? null,
        image: resolveMediaUrl(item?.image?.image || item?.thumbnail || item?.image, PLACEHOLDER_IMAGE),
        href: item?.slug ? `/products/${item.slug}` : '/products',
    }));
};

const ProductDetails = () => {
    const { slug } = useParams();
    const { refreshCart } = useCart();
    const { setting } = useSettings();

    const [qty, setQty] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);

    const [addToCartMutation] = useAddToCartMutation();

    const {
        data: response,
        isLoading,
        isFetching,
        error,
    } = useGetProductBySlugQuery(slug, { skip: !slug });

    const productData = useMemo(() => {
        if (!response) return null;
        if (response?.product) return response;
        if (response?.data?.product) return response.data;
        return null;
    }, [response]);

    const product = productData?.product || null;
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

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const pageTitle = product?.name
            ? `${product.name} | ${siteTitle}`
            : `Product Details | ${siteTitle}`;
        document.title = pageTitle;
    }, [product?.name, siteTitle]);

    const images = useMemo(() => {
        if (!product) return [];

        const featureImagePath = typeof product?.feature_image === 'string'
            ? product.feature_image
            : product?.feature_image?.image;

        const feature = resolveMediaUrl(
            featureImagePath || product?.image?.image || product?.thumbnail || product?.image,
            null
        );

        const gallerySource = Array.isArray(product?.gallery_images) && product.gallery_images.length > 0
            ? product.gallery_images
            : (Array.isArray(product?.images) ? product.images : []);

        const gallery = gallerySource
            .map((img) => {
                if (typeof img === 'string') return resolveMediaUrl(img, null);
                return resolveMediaUrl(img?.image, null);
            })
            .filter(Boolean);

        const merged = [feature, ...gallery].filter(Boolean);
        const unique = [...new Set(merged)];

        if (unique.length > 0) return unique;

        const fallback = resolveMediaUrl(product?.image?.image || product?.thumbnail || product?.image, PLACEHOLDER_IMAGE);
        return [fallback || PLACEHOLDER_IMAGE];
    }, [product]);

    const sizes = useMemo(() => {
        if (!product) return [];

        const sizePricingRows = Array.isArray(product?.size_pricing) && product.size_pricing.length > 0
            ? product.size_pricing
            : (Array.isArray(product?.size_pricings) ? product.size_pricings : []);

        const variantRows = sizePricingRows.length > 0
            ? sizePricingRows
            : (Array.isArray(product?.prosizes) ? product.prosizes : []);

        return variantRows.map((item, index) => {
            const variantId = item?.id ?? item?.product_size_id ?? item?.size_variant_id ?? null;
            const catalogSizeId = item?.catalog_size_id ?? item?.size_id ?? item?.size?.id ?? null;
            const key = variantId ?? `custom-size-${catalogSizeId ?? index}`;

            return {
                id: key,
                variantId: variantId ?? null,
                catalogSizeId: catalogSizeId ?? null,
                name: item?.size_name || item?.resolved_size_name || toSizeName(item),
                price: item?.price ?? item?.new_price ?? product?.new_price ?? product?.price ?? 0,
                isDefault: Boolean(item?.is_default),
            };
        });
    }, [product]);

    const colors = useMemo(() => {
        if (!Array.isArray(product?.procolors)) return [];

        return product.procolors.map((item) => ({
            id: item.id,
            name: toColorName(item),
        }));
    }, [product?.procolors]);

    const selectedSizeObj = useMemo(
        () => sizes.find((item) => String(item.id) === String(selectedSize)) || null,
        [sizes, selectedSize]
    );

    const selectedColorObj = useMemo(
        () => colors.find((item) => String(item.id) === String(selectedColor)) || null,
        [colors, selectedColor]
    );

    const price = useMemo(() => {
        if (!product) return 0;

        if (selectedSizeObj?.price !== null && selectedSizeObj?.price !== undefined) {
            return Number(selectedSizeObj.price) || 0;
        }

        return Number(product.new_price ?? product.price ?? 0);
    }, [product, selectedSizeObj]);

    useEffect(() => {
        if (!sizes.length) {
            setSelectedSize(null);
            return;
        }

        const selectedExists = sizes.some((item) => String(item.id) === String(selectedSize));
        if (!selectedExists) {
            const defaultSize = sizes.find((item) => item.isDefault) || sizes[0];
            setSelectedSize(defaultSize.id);
        }
    }, [sizes, selectedSize]);

    const previousPrice = product?.old_price ?? product?.previous_price ?? '';
    const categoryLabel = product?.category?.name || '';

    const stockRaw = product?.available_stock ?? product?.inventory?.available ?? product?.stock;
    const hasStockValue = stockRaw !== null && stockRaw !== undefined && stockRaw !== '';
    const stockValue = hasStockValue ? Number(stockRaw) : 0;
    const isDropShipping = product?.product_type === 'dropshipping_product';
    const outOfStock = isDropShipping && hasStockValue && stockValue <= 0;
    const stockText = hasStockValue
        ? (stockValue <= 0 ? 'Out of stock' : `In Stock: ${stockValue}`)
        : '';

    const relatedProducts = useMemo(
        () => mapRelatedProducts(productData?.related_products),
        [productData?.related_products]
    );

    const contactConfig = useMemo(() => ({
        hotline: setting?.hotline || FALLBACK_CONTACT_PHONE,
        whatsapp: setting?.whatsapp || setting?.hotline || FALLBACK_WHATSAPP_PHONE,
        messenger: setting?.messenger || FALLBACK_MESSENGER_URL,
    }), [setting?.hotline, setting?.whatsapp, setting?.messenger]);

    const handleAddToCart = async (redirectToCheckout = false) => {
        if (!product?.id) return;

        try {
            await addToCartMutation({
                product_id: product.id,
                quantity: qty,
                options: {
                    product_size: selectedSizeObj?.name || null,
                    product_color: selectedColorObj?.name || null,
                    size: selectedSizeObj?.name || null,
                    color: selectedColorObj?.name || null,
                    product_size_id: selectedSizeObj?.variantId || null,
                    size_variant_id: selectedSizeObj?.variantId || null,
                    size_id: selectedSizeObj?.variantId || null,
                    catalog_size_id: selectedSizeObj?.catalogSizeId || null,
                    color_id: selectedColorObj?.id || null,
                    sku: product?.sku || product?.product_code || null,
                    price,
                    selected_size_price: selectedSizeObj?.price ?? null,
                },
            }).unwrap();

            await refreshCart();

            if (redirectToCheckout) {
                window.location.href = '/checkout';
                return;
            }

            showSmartSuccessToast('Product successfully added to cart');
        } catch (requestError) {
            console.error('Add to cart failed', requestError);
            alert('Failed to add to cart.');
        }
    };

    return (
        <ProductDetailView
            loading={isLoading || isFetching}
            error={error}
            product={{
                id: product?.id,
                slug: product?.slug,
                name: product?.name,
                sku: product?.sku || product?.product_code,
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
            descriptionHtml={product?.description || ''}
            youtubeVideoUrl={product?.youtube_video_url || ''}
            facebookVideoUrl={product?.facebook_video_url || ''}
            videoId={product?.pro_video || ''}
            relatedProducts={relatedProducts}
            relatedTitle="Related Products"
            contact={contactConfig}
        />
    );
};

export default ProductDetails;
