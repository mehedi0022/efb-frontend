import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import Button from '../../components/common/Button';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useAdminFetchQuery } from '../../../store/adminApi';
import { resolveMediaUrl } from '../../../utils/media';

const sanitizeHtml = (value) => String(value ?? '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');

const ProductView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { data: response, isLoading, isFetching, error } = useAdminFetchQuery(
        { url: `/admin/products/${id}`, tags: ['products'] },
        { skip: !id }
    );
    const product = response?.data || null;
    const loading = isLoading || isFetching;
    const featureImage = product?.feature_image?.image
        || product?.feature_image
        || product?.image?.image
        || product?.image
        || '';
    const galleryImages = Array.isArray(product?.gallery_images) ? product.gallery_images : [];
    const sizePricing = Array.isArray(product?.size_pricing) ? product.size_pricing : [];

    useEffect(() => {
        if (error) {
            console.error('Error fetching product:', error);
            alert('Error fetching product details');
            navigate('/products');
        }
    }, [error, navigate]);

    if (loading) {
        return <div className="p-6 text-center">Loading product details...</div>;
    }

    if (!product) {
        return <div className="p-6 text-center text-red-600">Product not found</div>;
    }

    return (
        <ErrorBoundary>
            <div className="container-fluid">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/products')}
                            icon={FiArrowLeft}
                        >
                            Back
                        </Button>
                        <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => navigate(`/products/edit/${id}`)}
                        icon={FiEdit2}
                    >
                        Edit Product
                    </Button>
                </div>

                <div className="bg-white rounded-lg shadow-card p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Image Section */}
                        <div className="col-span-1">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border">
                                {featureImage || product.image ? (
                                    <img
                                        src={resolveMediaUrl(featureImage || product.image, 'https://via.placeholder.com/400?text=No+Image')}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => e.target.src = 'https://via.placeholder.com/400?text=No+Image'}
                                    />
                                ) : (
                                    <span className="text-gray-400">No Image</span>
                                )}
                            </div>

                            {galleryImages.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    {galleryImages.map((img) => (
                                        <div key={img.id} className="aspect-square overflow-hidden rounded border bg-gray-100">
                                            <img
                                                src={resolveMediaUrl(img.image, 'https://via.placeholder.com/120?text=No+Image')}
                                                alt="Gallery"
                                                className="h-full w-full object-cover"
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/120?text=No+Image'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* details section */}
                        <div className="col-span-1 md:col-span-2 space-y-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                                <p className="text-gray-500 mt-1">SKU: {product.sku || 'N/A'}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Category</h3>
                                    <p className="mt-1 text-lg font-medium">{product.category?.name || '-'}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Subcategory</h3>
                                    <p className="mt-1 text-lg font-medium">{product.subcategory?.name || '-'}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Brand</h3>
                                    <p className="mt-1 text-lg font-medium">{product.brand?.name || '-'}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Stock Status</h3>
                                    <div className="mt-1">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-1">Pricing</h3>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-3xl font-bold text-admin-primary">৳{product.selling_price}</span>
                                        {product.old_price > 0 && (
                                            <span className="text-lg text-gray-400 line-through">৳{product.old_price}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">Purchase Price: ৳{product.purchase_price}</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Status & Visibility</h3>
                                    <div className="flex gap-2">
                                        {product.status === 1 ? (
                                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Inactive</span>
                                        )}
                                        {product.topsale === 1 && (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Top Sale</span>
                                        )}
                                        {product.feature === 1 && (
                                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">Featured</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {sizePricing.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Size-wise Pricing</h3>
                                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold">Size</th>
                                                    <th className="px-3 py-2 text-left font-semibold">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sizePricing.map((row) => (
                                                    <tr key={row.id} className="border-t">
                                                        <td className="px-3 py-2">
                                                            {row.size_name || '-'}
                                                            {row.is_default ? (
                                                                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                                                    Default
                                                                </span>
                                                            ) : null}
                                                        </td>
                                                        <td className="px-3 py-2 font-semibold">৳{row.price}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {product.description && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                                    <div
                                        className="prose max-w-none text-gray-600 bg-white p-4 border rounded-lg"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default ProductView;
