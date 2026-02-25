import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { Button as AntButton, Card, Input, InputNumber, Radio, Select, Space, Upload } from 'antd';
import Button from '../../components/common/Button';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';
import { resolveMediaUrl } from '../../../utils/media';
import RichTextEditor, { richTextToPlainText } from '../../components/common/RichTextEditor';

const createSizePricingRow = (isDefault = false) => ({
    size_id: null,
    price: null,
    is_default: isDefault,
    auto_price_from_base: isDefault,
});

const hasValue = (value) => value !== null && value !== undefined && value !== '';
const hasRichTextContent = (value) => richTextToPlainText(value).length > 0;

const normalizeUploadFileList = (fileList = []) => {
    return (fileList || []).map((file) => ({
        ...file,
        status: file.status || 'done',
    }));
};

const ProductEdit = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);

    const { data: filterResponse } = useAdminFetchQuery(
        { url: '/admin/products/filters', tags: ['product-filters'] },
        { pollingInterval: 10000 }
    );
    const { data: productResponse, error: productError } = useAdminFetchQuery(
        { url: `/admin/products/${id}`, tags: ['products'] },
        { skip: !id }
    );

    const [adminAction] = useAdminActionMutation();

    const options = useMemo(() => ({
        categories: filterResponse?.data?.categories || [],
        subcategories: filterResponse?.data?.subcategories || [],
        brands: filterResponse?.data?.brands || [],
        colors: filterResponse?.data?.colors || [],
        sizes: filterResponse?.data?.sizes || [],
    }), [filterResponse]);

    const [formData, setFormData] = useState({
        name: '',
        category_id: null,
        subcategory_id: null,
        brand_id: null,
        purchase_price: null,
        selling_price: null,
        old_price: null,
        stock: 0,
        description: '',
        youtube_video_url: '',
        facebook_video_url: '',
        status: 1,
        colors: [],
        size_pricing: [createSizePricingRow(true)],
        feature_image_preview: '',
    });

    const [featureImageFileList, setFeatureImageFileList] = useState([]);
    const [galleryImageFileList, setGalleryImageFileList] = useState([]);
    const [removeGalleryImageIds, setRemoveGalleryImageIds] = useState([]);

    useEffect(() => {
        if (productResponse?.success && productResponse?.data) {
            const product = productResponse.data;

            const sizeRows = Array.isArray(product?.size_pricing) && product.size_pricing.length > 0
                ? product.size_pricing.map((row, index) => ({
                    size_id: row?.size_id ?? null,
                    price: row?.price ?? null,
                    is_default: !!row?.is_default || index === 0,
                    auto_price_from_base: false,
                }))
                : [createSizePricingRow(true)];

            if (!sizeRows.some((row) => row.is_default)) {
                sizeRows[0].is_default = true;
            }

            const existingGallery = Array.isArray(product?.gallery_images)
                ? product.gallery_images
                    .filter((img) => img?.id && img?.image)
                    .map((img) => ({
                        uid: `existing-${img.id}`,
                        name: `gallery-${img.id}`,
                        status: 'done',
                        url: resolveMediaUrl(img.image, ''),
                        existingId: img.id,
                    }))
                : [];

            setFormData({
                name: product.name || '',
                category_id: product.category?.id || null,
                subcategory_id: product.subcategory?.id || null,
                brand_id: product.brand?.id || null,
                purchase_price: product.purchase_price ?? null,
                selling_price: product.selling_price ?? null,
                old_price: product.old_price ?? null,
                stock: product.stock ?? 0,
                description: product.description || '',
                youtube_video_url: product.youtube_video_url || '',
                facebook_video_url: product.facebook_video_url || '',
                status: product.status ?? 1,
                colors: Array.isArray(product.colors) ? product.colors.map((item) => item.id) : [],
                size_pricing: sizeRows,
                feature_image_preview: product?.feature_image?.image
                    || product?.feature_image
                    || product?.image?.image
                    || product?.image
                    || '',
            });

            setFeatureImageFileList([]);
            setGalleryImageFileList(existingGallery);
            setRemoveGalleryImageIds([]);
        }
    }, [productResponse]);

    useEffect(() => {
        if (productError) {
            console.error('Error fetching product:', productError);
            alert('Error fetching product details');
            navigate('/products');
        }
    }, [productError, navigate]);

    const filteredSubcategories = formData.category_id
        ? options.subcategories.filter((sub) => String(sub.category_id) === String(formData.category_id))
        : [];

    const setField = (key, value) => {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const addSizePricingRow = () => {
        setFormData((prev) => ({
            ...prev,
            size_pricing: [...prev.size_pricing, createSizePricingRow(false)],
        }));
    };

    const removeSizePricingRow = (rowIndex) => {
        setFormData((prev) => {
            const nextRows = prev.size_pricing.filter((_, index) => index !== rowIndex);
            if (!nextRows.length) {
                return {
                    ...prev,
                    size_pricing: [createSizePricingRow(true)],
                };
            }

            const hasDefault = nextRows.some((row) => row.is_default);
            if (!hasDefault) {
                nextRows[0] = {
                    ...nextRows[0],
                    is_default: true,
                };

                if (hasValue(nextRows[0]?.price)) {
                    return {
                        ...prev,
                        selling_price: nextRows[0].price,
                        size_pricing: nextRows,
                    };
                }

                const baseSellingPrice = prev.selling_price;
                const hasPrice = nextRows[0].price !== null && nextRows[0].price !== undefined && nextRows[0].price !== '';
                if (baseSellingPrice !== null && baseSellingPrice !== undefined && baseSellingPrice !== '' && !hasPrice) {
                    nextRows[0] = {
                        ...nextRows[0],
                        price: baseSellingPrice,
                        auto_price_from_base: true,
                    };
                }
            }

            return {
                ...prev,
                size_pricing: nextRows,
            };
        });
    };

    const updateSizePricingRow = (rowIndex, updates) => {
        setFormData((prev) => {
            const rows = [...prev.size_pricing];
            const nextRow = {
                ...rows[rowIndex],
                ...updates,
            };
            if (Object.prototype.hasOwnProperty.call(updates, 'price')) {
                nextRow.auto_price_from_base = false;
            }
            rows[rowIndex] = nextRow;

            const isDefaultRow = !!rows[rowIndex]?.is_default;
            const isUpdatingPrice = Object.prototype.hasOwnProperty.call(updates, 'price');
            if (isDefaultRow && isUpdatingPrice && hasValue(nextRow.price)) {
                return {
                    ...prev,
                    selling_price: nextRow.price,
                    size_pricing: rows,
                };
            }

            return {
                ...prev,
                size_pricing: rows,
            };
        });
    };

    const setDefaultSizeRow = (rowIndex) => {
        setFormData((prev) => {
            const rows = prev.size_pricing.map((row, index) => ({
                ...row,
                is_default: index === rowIndex,
            }));

            const nextDefaultRow = rows[rowIndex];
            if (nextDefaultRow && hasValue(nextDefaultRow.price)) {
                return {
                    ...prev,
                    selling_price: nextDefaultRow.price,
                    size_pricing: rows,
                };
            }

            const baseSellingPrice = prev.selling_price;
            if (hasValue(baseSellingPrice)) {
                const defaultRow = rows[rowIndex];
                if (!hasValue(defaultRow?.price) && defaultRow) {
                    rows[rowIndex] = {
                        ...defaultRow,
                        price: baseSellingPrice,
                        auto_price_from_base: true,
                    };
                }
            }

            return {
                ...prev,
                size_pricing: rows,
            };
        });
    };

    useEffect(() => {
        if (formData.selling_price === null || formData.selling_price === undefined || formData.selling_price === '') {
            return;
        }

        setFormData((prev) => {
            let hasChanges = false;
            const rows = prev.size_pricing.map((row) => {
                if (!row.is_default) {
                    return row;
                }

                const isPriceEmpty = row.price === null || row.price === undefined || row.price === '';
                const shouldAutoSync = isPriceEmpty || row.auto_price_from_base === true;
                if (!shouldAutoSync) {
                    return row;
                }

                const nextPrice = prev.selling_price;
                if (Number(row.price) === Number(nextPrice) && row.auto_price_from_base === true) {
                    return row;
                }

                hasChanges = true;
                return {
                    ...row,
                    price: nextPrice,
                    auto_price_from_base: true,
                };
            });

            if (!hasChanges) {
                return prev;
            }

            return {
                ...prev,
                size_pricing: rows,
            };
        });
    }, [formData.selling_price]);

    const onFeatureUploadChange = ({ fileList }) => {
        const normalized = normalizeUploadFileList(fileList).slice(-1);
        setFeatureImageFileList(normalized);
    };

    const onGalleryUploadChange = ({ fileList }) => {
        setGalleryImageFileList(normalizeUploadFileList(fileList));
    };

    const onGalleryRemove = (file) => {
        if (file?.existingId) {
            setRemoveGalleryImageIds((prev) => {
                const next = new Set(prev);
                next.add(Number(file.existingId));
                return Array.from(next);
            });
        }
        return true;
    };

    const buildPayload = () => {
        const payload = new FormData();

        payload.append('name', String(formData.name || '').trim());
        payload.append('category_id', String(formData.category_id || ''));
        payload.append('purchase_price', String(formData.purchase_price ?? '0'));
        payload.append('selling_price', String(formData.selling_price ?? '0'));
        payload.append('stock', String(formData.stock ?? 0));
        payload.append('status', String(formData.status ?? 1));

        if (formData.subcategory_id) {
            payload.append('subcategory_id', String(formData.subcategory_id));
        }
        if (formData.brand_id) {
            payload.append('brand_id', String(formData.brand_id));
        }
        if (formData.old_price !== null && formData.old_price !== undefined && formData.old_price !== '') {
            payload.append('old_price', String(formData.old_price));
        } else {
            payload.append('old_price', '');
        }
        if (hasRichTextContent(formData.description)) {
            payload.append('description', String(formData.description || ''));
        }
        payload.append('youtube_video_url', String(formData.youtube_video_url || '').trim());
        payload.append('facebook_video_url', String(formData.facebook_video_url || '').trim());

        (formData.colors || []).forEach((colorId) => {
            payload.append('colors[]', String(colorId));
        });

        const normalizedRows = (formData.size_pricing || [])
            .map((row) => ({
                size_id: row.size_id,
                price: row.price,
                is_default: !!row.is_default,
            }))
            .filter((row) => row.size_id && row.price !== null && row.price !== undefined && row.price !== '');

        if (normalizedRows.length) {
            let hasDefault = normalizedRows.some((row) => row.is_default);
            normalizedRows.forEach((row, index) => {
                payload.append(`size_pricing[${index}][size_id]`, String(row.size_id));
                payload.append(`size_pricing[${index}][price]`, String(row.price));

                const isDefault = row.is_default || (!hasDefault && index === 0);
                if (isDefault) {
                    hasDefault = true;
                }
                payload.append(`size_pricing[${index}][is_default]`, isDefault ? '1' : '0');
            });
        }

        removeGalleryImageIds.forEach((imageId) => {
            payload.append('remove_gallery_image_ids[]', String(imageId));
        });

        const featureFile = featureImageFileList[0]?.originFileObj;
        if (featureFile instanceof File) {
            payload.append('feature_image', featureFile);
        }

        galleryImageFileList.forEach((file) => {
            if (file?.originFileObj instanceof File) {
                payload.append('gallery_images[]', file.originFileObj);
            }
        });

        return payload;
    };

    const validateBeforeSubmit = () => {
        if (!String(formData.name || '').trim()) {
            return 'Product name is required.';
        }
        if (!formData.category_id) {
            return 'Category is required.';
        }
        if (formData.purchase_price === null || formData.purchase_price === undefined) {
            return 'Purchase price is required.';
        }
        if (formData.selling_price === null || formData.selling_price === undefined) {
            return 'Base selling price is required.';
        }
        const hasYoutube = String(formData.youtube_video_url || '').trim().length > 0;
        const hasFacebook = String(formData.facebook_video_url || '').trim().length > 0;
        if (hasYoutube && hasFacebook) {
            return 'You can set either YouTube or Facebook video, not both.';
        }

        const validRows = (formData.size_pricing || []).filter((row) => row.size_id || row.price !== null);
        for (const row of validRows) {
            if (!row.size_id) {
                return 'Each size row must have a selected size.';
            }
            if (row.price === null || row.price === undefined || row.price === '') {
                return 'Each size row must have a price.';
            }
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationError = validateBeforeSubmit();
        if (validationError) {
            alert(validationError);
            return;
        }

        setLoading(true);
        try {
            await adminAction({
                url: `/admin/products/${id}`,
                method: 'PUT',
                body: buildPayload(),
                invalidates: ['products'],
            }).unwrap();

            navigate('/products');
        } catch (error) {
            console.error('Error updating product:', error);
            alert(error?.data?.message || 'Error updating product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ErrorBoundary>
            <div className="container-fluid">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/products')}
                            icon={FiArrowLeft}
                        >
                            Back
                        </Button>
                        <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card title="Basic Information" className="shadow-card">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-gray-700">Product Name *</label>
                                <Input
                                    size="large"
                                    value={formData.name}
                                    onChange={(event) => setField('name', event.target.value)}
                                    placeholder="Enter product name"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Category *</label>
                                <Select
                                    size="large"
                                    value={formData.category_id}
                                    onChange={(value) => {
                                        setField('category_id', value);
                                        setField('subcategory_id', null);
                                    }}
                                    options={options.categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                                    placeholder="Select category"
                                    allowClear
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Subcategory</label>
                                <Select
                                    size="large"
                                    value={formData.subcategory_id}
                                    onChange={(value) => setField('subcategory_id', value)}
                                    options={filteredSubcategories.map((sub) => ({ value: sub.id, label: sub.name }))}
                                    placeholder="Select subcategory"
                                    allowClear
                                    disabled={!formData.category_id}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Brand</label>
                                <Select
                                    size="large"
                                    value={formData.brand_id}
                                    onChange={(value) => setField('brand_id', value)}
                                    options={options.brands.map((brand) => ({ value: brand.id, label: brand.name }))}
                                    placeholder="Select brand"
                                    allowClear
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Colors</label>
                                <Select
                                    mode="multiple"
                                    size="large"
                                    value={formData.colors}
                                    onChange={(values) => setField('colors', values || [])}
                                    options={options.colors.map((color) => ({ value: Number(color.id), label: color.name }))}
                                    placeholder="Select colors"
                                    allowClear
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card
                        title="Size-wise Pricing"
                        extra={(
                            <AntButton type="dashed" icon={<FiPlus />} onClick={addSizePricingRow}>
                                Add Size Row
                            </AntButton>
                        )}
                        className="shadow-card"
                    >
                        <div className="space-y-3">
                            {formData.size_pricing.map((row, rowIndex) => (
                                <div key={`size-pricing-${rowIndex}`} className="rounded-lg border border-gray-200 p-3">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_160px_48px] md:items-end">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">Size *</label>
                                            <Select
                                                size="large"
                                                value={row.size_id}
                                                onChange={(value) => updateSizePricingRow(rowIndex, { size_id: value })}
                                                options={options.sizes.map((size) => ({ value: Number(size.id), label: size.name }))}
                                                placeholder="Select size"
                                                allowClear
                                                showSearch
                                                optionFilterProp="label"
                                                style={{ width: '100%' }}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">Price *</label>
                                            <InputNumber
                                                size="large"
                                                value={row.price}
                                                onChange={(value) => updateSizePricingRow(rowIndex, { price: value })}
                                                min={0}
                                                className="!w-full"
                                                placeholder="0.00"
                                                style={{ width: '100%' }}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">Default</label>
                                            <div className="h-10 flex items-center px-2 border border-gray-200 rounded-lg">
                                                <Radio
                                                    checked={!!row.is_default}
                                                    onChange={() => setDefaultSizeRow(rowIndex)}
                                                >
                                                    Default
                                                </Radio>
                                            </div>
                                        </div>

                                        <div>
                                            <AntButton
                                                danger
                                                type="text"
                                                icon={<FiTrash2 />}
                                                onClick={() => removeSizePricingRow(rowIndex)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Pricing & Inventory" className="shadow-card">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Purchase Price *</label>
                                <InputNumber
                                    size="large"
                                    value={formData.purchase_price}
                                    onChange={(value) => setField('purchase_price', value)}
                                    min={0}
                                    className="!w-full"
                                    placeholder="0.00"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Base Selling Price *</label>
                                <InputNumber
                                    size="large"
                                    value={formData.selling_price}
                                    onChange={(value) => setField('selling_price', value)}
                                    min={0}
                                    className="!w-full"
                                    placeholder="0.00"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Old Price</label>
                                <InputNumber
                                    size="large"
                                    value={formData.old_price}
                                    onChange={(value) => setField('old_price', value)}
                                    min={0}
                                    className="!w-full"
                                    placeholder="0.00"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Stock</label>
                                <InputNumber
                                    size="large"
                                    value={formData.stock}
                                    onChange={(value) => setField('stock', value)}
                                    min={0}
                                    className="!w-full"
                                    placeholder="0"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title="Images" className="shadow-card">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Feature Image</label>
                                {formData.feature_image_preview ? (
                                    <div className="mb-3 rounded border border-gray-200 p-2 inline-block">
                                        <img
                                            src={resolveMediaUrl(formData.feature_image_preview, 'https://via.placeholder.com/80')}
                                            alt="Current feature"
                                            className="h-20 w-20 rounded object-cover"
                                        />
                                    </div>
                                ) : null}
                                <Upload
                                    listType="picture-card"
                                    fileList={featureImageFileList}
                                    onChange={onFeatureUploadChange}
                                    beforeUpload={() => false}
                                    maxCount={1}
                                    accept="image/*"
                                >
                                    {featureImageFileList.length >= 1 ? null : 'Upload'}
                                </Upload>
                                <p className="text-xs text-gray-500">Recommended size: 1200 x 1200 px (square)</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Gallery Images</label>
                                <Upload
                                    listType="picture-card"
                                    fileList={galleryImageFileList}
                                    onChange={onGalleryUploadChange}
                                    onRemove={onGalleryRemove}
                                    beforeUpload={() => false}
                                    multiple
                                    accept="image/*"
                                >
                                    Upload
                                </Upload>
                                <p className="text-xs text-gray-500">Recommended size: 1200 x 1200 px (consistent ratio)</p>
                            </div>
                        </div>
                    </Card>

                    <Card title="Details & Settings" className="shadow-card">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                                <RichTextEditor
                                    value={formData.description}
                                    onChange={(nextHtml) => setField('description', nextHtml)}
                                    placeholder="Write formatted product description..."
                                    minHeight={220}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">YouTube Video URL</label>
                                <Input
                                    size="large"
                                    value={formData.youtube_video_url}
                                    onChange={(event) => setField('youtube_video_url', event.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=... or YouTube video ID"
                                    style={{ width: '100%' }}
                                />
                                <p className="mt-1 text-xs text-gray-500">Use either YouTube or Facebook video.</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Facebook Video URL</label>
                                <Input
                                    size="large"
                                    value={formData.facebook_video_url}
                                    onChange={(event) => setField('facebook_video_url', event.target.value)}
                                    placeholder="https://www.facebook.com/.../videos/..."
                                    style={{ width: '100%' }}
                                />
                                <p className="mt-1 text-xs text-gray-500">Provide only one video source.</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                                <Select
                                    size="large"
                                    value={formData.status}
                                    onChange={(value) => setField('status', value)}
                                    options={[
                                        { value: 1, label: 'Active' },
                                        { value: 0, label: 'Inactive' },
                                    ]}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end border-t pt-4">
                        <Space>
                            <Button
                                variant="secondary"
                                onClick={() => navigate('/products')}
                                icon={FiArrowLeft}
                                type="button"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                icon={FiSave}
                                loading={loading}
                            >
                                Update Product
                            </Button>
                        </Space>
                    </div>
                </form>
            </div>
        </ErrorBoundary>
    );
};

export default ProductEdit;
