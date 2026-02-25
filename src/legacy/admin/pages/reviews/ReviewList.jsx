import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const ReviewList = () => {
    const { filter = 'all' } = useParams();
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentReview, setCurrentReview] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [formData, setFormData] = useState({
        customer_id: '',
        product_id: '',
        ratting: '',
        review: '',
        status: 1,
        name: '',
        email: '',
    });

    const tagKey = 'reviews';
    const { data: metaResponse } = useAdminFetchQuery({ url: '/admin/reviews/meta', tags: ['review-meta'] });
    const url = filter === 'pending' ? '/admin/reviews/pending' : '/admin/reviews';
    const queryArgs = useMemo(() => ({
        url,
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: [tagKey],
    }), [url, keyword, pagination.current_page]);
    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const reviews = response?.data || [];
    const loading = isLoading || isFetching;

    useEffect(() => {
        if (metaResponse?.success) {
            setProducts(metaResponse.products || []);
            setCustomers(metaResponse.customers || []);
        }
    }, [metaResponse]);

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        setIsEditing(false);
        setCurrentReview(null);
        setFormData({
            customer_id: customers[0]?.id || '',
            product_id: products[0]?.id || '',
            ratting: '',
            review: '',
            status: 1,
            name: '',
            email: '',
        });
        setIsModalOpen(true);
    };

    const handleEdit = (review) => {
        setIsEditing(true);
        setCurrentReview(review);
        setFormData({
            customer_id: review.customer_id || '',
            product_id: review.product_id || '',
            ratting: review.ratting || '',
            review: review.review || '',
            status: review.status === 'active' || review.status === 1 ? 1 : 0,
            name: review.name || '',
            email: review.email || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing && currentReview) {
                await adminAction({
                    url: `/admin/reviews/${currentReview.id}`,
                    method: 'PUT',
                    body: formData,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/reviews',
                    method: 'POST',
                    body: formData,
                    invalidates: [tagKey],
                }).unwrap();
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving review:', error);
            alert(error?.data?.message || 'Failed to save review');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete?')) return;
        try {
            await adminAction({
                url: `/admin/reviews/${id}`,
                method: 'DELETE',
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error deleting review:', error);
        }
    };

    const handleStatus = async (id, makeActive) => {
        try {
            await adminAction({
                url: `/admin/reviews/${id}/${makeActive ? 'activate' : 'deactivate'}`,
                method: 'POST',
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error updating review status:', error);
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '6%' },
        { header: 'Product', accessor: 'product', width: '20%', render: (row) => row.product?.name || 'N/A' },
        { header: 'Customer', accessor: 'customer', width: '20%', render: (row) => row.name || row.customer?.name || 'N/A' },
        { header: 'Rating', accessor: 'ratting', width: '10%' },
        { header: 'Review', accessor: 'review', width: '30%' },
        {
            header: 'Status',
            accessor: 'status',
            width: '8%',
            render: (row) => (
                <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${row.status === 'active' || row.status === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                        }`}
                >
                    {row.status === 'active' || row.status === 1 ? 'Active' : 'Pending'}
                </span>
            ),
        },
        {
            header: 'Actions',
            accessor: 'actions',
            width: '12%',
            render: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                        <FiEdit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                        <FiTrash2 size={16} />
                    </button>
                    {row.status === 'active' || row.status === 1 ? (
                        <button
                            onClick={() => handleStatus(row.id, false)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Deactivate"
                        >
                            <FiX size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleStatus(row.id, true)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Activate"
                        >
                            <FiCheck size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="container-fluid">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
                <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                    Add Review
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-card p-4 mb-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-card">
                <DataTable columns={columns} data={reviews} loading={loading} />
            </div>

            {pagination.last_page > 1 && (
                <div className="flex justify-center mt-4 gap-2">
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Review' : 'Add Review'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={formData.customer_id}
                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                required
                            >
                                <option value="">Select Customer</option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name} ({customer.phone})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {isEditing && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <Input
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={formData.product_id}
                            onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                            required
                        >
                            <option value="">Select Product</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                        <Input
                            type="number"
                            value={formData.ratting}
                            onChange={(e) => setFormData({ ...formData, ratting: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            rows="4"
                            value={formData.review}
                            onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            required
                        >
                            <option value={1}>Active</option>
                            <option value={0}>Pending</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {isEditing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ReviewList;
