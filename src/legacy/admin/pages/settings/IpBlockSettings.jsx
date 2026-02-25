import React, { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const formatDateTime = (value) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
};

const IpBlockSettings = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [formData, setFormData] = useState({
        ip_no: '',
        reason: '',
    });

    const tagKey = 'ip-blocks';
    const queryArgs = useMemo(() => ({
        url: '/admin/ip-blocks',
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: [tagKey],
    }), [keyword, pagination.current_page]);

    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const items = response?.data || [];
    const loading = isLoading || isFetching;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        setIsEditing(false);
        setCurrentItem(null);
        setFormData({
            ip_no: '',
            reason: '',
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setCurrentItem(item);
        setFormData({
            ip_no: item.ip_no || '',
            reason: item.reason || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const payload = {
                ip_no: formData.ip_no.trim(),
                reason: formData.reason.trim(),
            };

            if (isEditing && currentItem) {
                await adminAction({
                    url: `/admin/ip-blocks/${currentItem.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/ip-blocks',
                    method: 'POST',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            }

            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving IP block:', error);
            alert(error?.data?.message || 'Failed to save blocked IP');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this blocked IP?')) return;
        try {
            await adminAction({
                url: '/admin/ip-blocks/delete',
                method: 'DELETE',
                body: { ids: [id] },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error deleting blocked IP:', error);
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '6%' },
        { header: 'IP Address', accessor: 'ip_no', width: '20%' },
        {
            header: 'Reason',
            accessor: 'reason',
            width: '40%',
            render: (row) => (
                <p className="max-w-xl whitespace-pre-wrap break-words text-sm text-gray-700">
                    {row.reason || '-'}
                </p>
            ),
        },
        {
            header: 'Created',
            accessor: 'created_at',
            width: '18%',
            render: (row) => formatDateTime(row.created_at),
        },
        {
            header: 'Actions',
            accessor: 'actions',
            width: '16%',
            render: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="rounded p-2 text-blue-600 hover:bg-blue-50"
                    >
                        <FiEdit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="rounded p-2 text-red-600 hover:bg-red-50"
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="container-fluid">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">IP Blocking</h2>
                <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                    Add Blocked IP
                </Button>
            </div>

            <div className="mb-4 rounded-lg bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by IP or reason..."
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-lg bg-white shadow-card">
                <DataTable columns={columns} data={items} loading={loading} />
            </div>

            {pagination.last_page > 1 && (
                <div className="mt-4 flex justify-center gap-2">
                    {Array.from({ length: pagination.last_page }, (_, index) => index + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => setPagination({ ...pagination, current_page: page })}
                            className={`rounded px-4 py-2 ${page === pagination.current_page
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
                title={isEditing ? 'Edit Blocked IP' : 'Add Blocked IP'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">IP Address</label>
                        <Input
                            value={formData.ip_no}
                            onChange={(event) => setFormData({ ...formData, ip_no: event.target.value })}
                            placeholder="e.g. 203.0.113.7"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                        <textarea
                            className="min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
                            value={formData.reason}
                            onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
                            placeholder="Write blocking reason..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
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

export default IpBlockSettings;
