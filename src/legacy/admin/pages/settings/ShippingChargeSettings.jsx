import React, { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const ShippingChargeSettings = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCharge, setCurrentCharge] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        status: 1,
        front_view: 1,
    });

    const tagKey = 'shipping-charges';
    const queryArgs = useMemo(() => ({
        url: '/admin/shipping-charges',
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: [tagKey],
    }), [keyword, pagination.current_page]);
    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const charges = response?.data || [];
    const loading = isLoading || isFetching;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        setIsEditing(false);
        setCurrentCharge(null);
        setFormData({
            name: '',
            amount: '',
            status: 1,
            front_view: 1,
        });
        setIsModalOpen(true);
    };

    const handleEdit = (charge) => {
        setIsEditing(true);
        setCurrentCharge(charge);
        setFormData({
            name: charge.name || '',
            amount: charge.amount || '',
            status: Number(charge.status ?? 1),
            front_view: Number(charge.front_view ?? 0),
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                amount: formData.amount,
                status: Number(formData.status),
                front_view: Number(formData.front_view),
            };

            if (isEditing && currentCharge) {
                await adminAction({
                    url: `/admin/shipping-charges/${currentCharge.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/shipping-charges',
                    method: 'POST',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving shipping charge:', error);
            alert(error?.data?.message || 'Failed to save shipping charge');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete?')) return;
        try {
            await adminAction({
                url: '/admin/shipping-charges/delete',
                method: 'DELETE',
                body: { ids: [id] },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error deleting shipping charge:', error);
        }
    };

    const handleStatus = async (id, makeActive) => {
        try {
            await adminAction({
                url: '/admin/shipping-charges/update-status',
                method: 'POST',
                body: {
                    ids: [id],
                    status: makeActive ? 1 : 0,
                },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error updating shipping charge status:', error);
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '6%' },
        { header: 'Area Name', accessor: 'name', width: '25%' },
        { header: 'Amount', accessor: 'amount', width: '15%' },
        {
            header: 'Front View',
            accessor: 'front_view',
            width: '12%',
            render: (row) => (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${Number(row.front_view) === 1
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                    }`}>
                    {Number(row.front_view) === 1 ? 'Yes' : 'No'}
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            width: '10%',
            render: (row) => (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${Number(row.status) === 1
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {Number(row.status) === 1 ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            header: 'Actions',
            accessor: 'actions',
            width: '14%',
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
                    {Number(row.status) === 1 ? (
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
                <h2 className="text-2xl font-bold text-gray-900">Shipping Charges</h2>
                <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                    Add Charge
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
                <DataTable columns={columns} data={charges} loading={loading} />
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Edit Shipping Charge' : 'Add Shipping Charge'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Area Name</label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <Input
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                        >
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Front View</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={formData.front_view}
                            onChange={(e) => setFormData({ ...formData, front_view: Number(e.target.value) })}
                        >
                            <option value={1}>Yes</option>
                            <option value={0}>No</option>
                        </select>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
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

export default ShippingChargeSettings;
