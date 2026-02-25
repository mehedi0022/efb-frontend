import React, { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const ICON_OPTIONS = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'map', label: 'Google Map' },
    { value: 'website', label: 'Website' },
];

const FooterSocialLinks = () => {
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
        title: '',
        icon: 'facebook',
        url: '',
        sort_order: 0,
        status: 1,
    });

    const tagKey = 'footer-social-links';
    const queryArgs = useMemo(() => ({
        url: '/admin/footer-social-links',
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
            title: '',
            icon: 'facebook',
            url: '',
            sort_order: 0,
            status: 1,
        });
        setIsModalOpen(true);
    };

    const handleEdit = (row) => {
        setIsEditing(true);
        setCurrentItem(row);
        setFormData({
            title: row.title || '',
            icon: row.icon || 'facebook',
            url: row.url || '',
            sort_order: Number(row.sort_order ?? 0),
            status: Number(row.status ?? 1),
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                icon: formData.icon,
                url: formData.url,
                sort_order: Number(formData.sort_order ?? 0),
                status: Number(formData.status),
            };

            if (isEditing && currentItem) {
                await adminAction({
                    url: `/admin/footer-social-links/${currentItem.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/footer-social-links',
                    method: 'POST',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            }

            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving social link:', error);
            alert(error?.data?.message || 'Failed to save social link');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete?')) return;
        try {
            await adminAction({
                url: '/admin/footer-social-links/delete',
                method: 'DELETE',
                body: { ids: [id] },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error deleting social link:', error);
        }
    };

    const handleStatus = async (id, makeActive) => {
        try {
            await adminAction({
                url: '/admin/footer-social-links/update-status',
                method: 'POST',
                body: {
                    ids: [id],
                    status: makeActive ? 1 : 0,
                },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error updating social link status:', error);
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '6%' },
        { header: 'Title', accessor: 'title', width: '18%' },
        {
            header: 'Icon Key',
            accessor: 'icon',
            width: '14%',
            render: (row) => (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {row.icon || '-'}
                </span>
            ),
        },
        {
            header: 'URL',
            accessor: 'url',
            width: '30%',
            render: (row) => {
                const value = row.url || '';
                const href = /^https?:\/\//i.test(value) ? value : `https://${String(value).replace(/^\/+/, '')}`;
                return value ? (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-admin-primary hover:underline"
                    >
                        {value}
                    </a>
                ) : '-';
            },
        },
        {
            header: 'Order',
            accessor: 'sort_order',
            width: '8%',
            render: (row) => Number(row.sort_order ?? 0),
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
                <h2 className="text-2xl font-bold text-gray-900">Footer Social Links</h2>
                <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                    Add Social Link
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-card p-4 mb-4">
                <Input
                    placeholder="Search by title, icon or URL..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-lg shadow-card">
                <DataTable columns={columns} data={items} loading={loading} />
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
                title={isEditing ? 'Edit Social Link' : 'Add Social Link'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Icon Type</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        >
                            {ICON_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                        <Input
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            placeholder="https://example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                        <Input
                            type="number"
                            min={0}
                            value={formData.sort_order}
                            onChange={(e) => setFormData({
                                ...formData,
                                sort_order: Number(e.target.value || 0),
                            })}
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

export default FooterSocialLinks;
