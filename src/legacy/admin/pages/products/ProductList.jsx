import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiCheck, FiX, FiFilter, FiImage } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';
import { resolveMediaUrl } from '../../../utils/media';

const ProductList = () => {
    const navigate = useNavigate();
    const [selectedIds, setSelectedIds] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [filters, setFilters] = useState({
        category_id: '',
        subcategory_id: '',
        brand_id: '',
        status: '',
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    // Filter options
    const [showFilters, setShowFilters] = useState(false);

    const tagKey = 'products';
    const queryArgs = useMemo(() => ({
        url: '/admin/products',
        params: {
            keyword,
            ...filters,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: [tagKey],
    }), [keyword, filters, pagination.current_page]);
    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const { data: filterResponse } = useAdminFetchQuery({ url: '/admin/products/filters', tags: ['product-filters'] });
    const [adminAction] = useAdminActionMutation();
    const products = response?.data || [];
    const loading = isLoading || isFetching;
    const categories = filterResponse?.data?.categories || [];
    const subcategories = filterResponse?.data?.subcategories || [];
    const brands = filterResponse?.data?.brands || [];

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        navigate('/products/create');
    };

    const handleEdit = (product) => {
        navigate(`/products/edit/${product.id}`);
    };

    const handleView = (product) => {
        navigate(`/products/${product.id}`);
    };

    const handleDelete = async (ids) => {
        if (!window.confirm('Are you sure you want to delete?')) return;

        try {
            await adminAction({
                url: '/admin/products/delete',
                method: 'DELETE',
                body: { product_ids: ids },
                invalidates: [tagKey, 'list:/admin/categories', 'list:/admin/subcategories'],
            }).unwrap();
            setSelectedIds([]);
        } catch (error) {
            console.error('Error deleting products:', error);
        }
    };

    const handleStatusUpdate = async (ids, status) => {
        try {
            await adminAction({
                url: '/admin/products/update-status',
                method: 'POST',
                body: {
                    product_ids: ids,
                    status,
                },
                invalidates: [tagKey],
            }).unwrap();
            setSelectedIds([]);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const columns = [
        {
            header: <input type="checkbox" onChange={(e) => {
                if (e.target.checked) {
                    setSelectedIds(products.map(p => p.id));
                } else {
                    setSelectedIds([]);
                }
            }} />,
            accessor: 'checkbox',
            width: '5%',
            render: (row) => (
                <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedIds([...selectedIds, row.id]);
                        } else {
                            setSelectedIds(selectedIds.filter(id => id !== row.id));
                        }
                    }}
                />
            ),
        },
        {
            header: 'Image',
            accessor: 'image',
            width: '8%',
            render: (row) => {
                const imageSrc = resolveMediaUrl(row?.image?.image || row.image, null);

                return (
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                        {imageSrc ? (
                        <img
                            src={imageSrc}
                            alt={row.name}
                            className="w-full h-full object-cover"
                            onError={(e) => e.target.src = 'https://via.placeholder.com/100'}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <FiImage className="text-gray-400" />
                        </div>
                    )}
                </div>
                );
            },
        },
        {
            header: 'Name',
            accessor: 'name',
            width: '20%',
            render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.sku && <div className="text-xs text-gray-500">SKU: {row.sku}</div>}
                </div>
            ),
        },
        {
            header: 'Category',
            accessor: 'category',
            width: '12%',
            render: (row) => row.category?.name || '-',
        },
        {
            header: 'Brand',
            accessor: 'brand',
            width: '10%',
            render: (row) => row.brand?.name || '-',
        },
        {
            header: 'Price',
            accessor: 'selling_price',
            width: '10%',
            render: (row) => (
                <div>
                    <div className="font-semibold text-green-600">৳{row.selling_price}</div>
                    {row.old_price && (
                        <div className="text-xs text-gray-500 line-through">৳{row.old_price}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'Stock',
            accessor: 'stock',
            width: '8%',
            render: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.stock > 10
                    ? 'bg-green-100 text-green-800'
                    : row.stock > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                    {row.stock}
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            width: '10%',
            render: (row) => (
                <div className="space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold block text-center ${row.status === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {row.status === 1 ? 'Active' : 'Inactive'}
                    </span>
                    {row.topsale === 1 && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 block text-center">
                            Top Sale
                        </span>
                    )}
                    {row.feature === 1 && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 block text-center">
                            Featured
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Actions',
            accessor: 'actions',
            width: '12%',
            render: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleView(row)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="View"
                    >
                        <FiEye size={16} />
                    </button>
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                    >
                        <FiEdit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete([row.id])}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];



    return (
        <ErrorBoundary>
            <div className="container-fluid">
                {/* Page Header */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">Manage Products</h2>
                    <Button
                        onClick={handleCreate}
                        variant="primary"
                        icon={FiPlus}
                    >
                        Add New Product
                    </Button>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow-card p-4 mb-4">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by name, SKU, or slug..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                        <Button
                            onClick={() => setShowFilters(!showFilters)}
                            variant="outline"
                            icon={FiFilter}
                            size="md"
                        >
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </Button>
                    </div>

                    {/* Advanced Filters */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    value={filters.category_id}
                                    onChange={(e) => setFilters({ ...filters, category_id: e.target.value, subcategory_id: '' })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subcategory
                                </label>
                                <select
                                    value={filters.subcategory_id}
                                    onChange={(e) => setFilters({ ...filters, subcategory_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
                                    disabled={!filters.category_id}
                                >
                                    <option value="">All Subcategories</option>
                                    {subcategories
                                        .filter(sub => !filters.category_id || sub.category_id == filters.category_id)
                                        .map(sub => (
                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Brand
                                </label>
                                <select
                                    value={filters.brand_id}
                                    onChange={(e) => setFilters({ ...filters, brand_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
                                >
                                    <option value="">All Brands</option>
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
                                >
                                    <option value="">All Status</option>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Bulk Actions */}
                    {selectedIds.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                            <Button
                                onClick={() => handleStatusUpdate(selectedIds, 1)}
                                variant="success"
                                size="sm"
                                icon={FiCheck}
                            >
                                Activate
                            </Button>
                            <Button
                                onClick={() => handleStatusUpdate(selectedIds, 0)}
                                variant="warning"
                                size="sm"
                                icon={FiX}
                            >
                                Deactivate
                            </Button>
                            <Button
                                onClick={() => handleDelete(selectedIds)}
                                variant="danger"
                                size="sm"
                                icon={FiTrash2}
                            >
                                Delete ({selectedIds.length})
                            </Button>
                        </div>
                    )}
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-lg shadow-card">
                    <DataTable
                        columns={columns}
                        data={products}
                        loading={loading}
                    />
                </div>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setPagination({ ...pagination, current_page: page })}
                                className={`px-4 py-2 rounded ${page === pagination.current_page
                                    ? 'bg-admin-primary text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};

export default ProductList;
