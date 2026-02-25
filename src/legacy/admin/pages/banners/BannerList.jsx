import React, { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const BannerList = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBanner, setCurrentBanner] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        link: '',
        status: 1,
        image: null,
    });
    const [selectedIds, setSelectedIds] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const tagKey = 'banners';
    const queryArgs = useMemo(() => ({
        url: '/admin/banners',
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: [tagKey],
    }), [keyword, pagination.current_page]);
    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const banners = response?.data || [];
    const loading = isLoading || isFetching;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        setIsEditing(false);
        setCurrentBanner(null);
        setFormData({
            title: '',
            link: '',
            status: 1,
            image: null,
        });
        setIsModalOpen(true);
    };

    const handleEdit = (banner) => {
        setIsEditing(true);
        setCurrentBanner(banner);
        setFormData({
            title: banner.title || '',
            link: banner.link,
            status: banner.status,
            image: null,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('link', formData.link);
            payload.append('status', formData.status);
            if (formData.image) {
                payload.append('image', formData.image);
            }

            if (isEditing && currentBanner) {
                await adminAction({
                    url: `/admin/banners/${currentBanner.id}`,
                    method: 'POST',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/banners',
                    method: 'POST',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving banner:', error);
            alert(error?.data?.message || 'Failed to save banner');
        }
    };

    const handleDelete = async (ids) => {
        if (!window.confirm('Are you sure you want to delete?')) return;
        try {
            await adminAction({
                url: '/admin/banners/delete',
                method: 'DELETE',
                body: { ids },
                invalidates: [tagKey],
            }).unwrap();
            setSelectedIds([]);
        } catch (error) {
            console.error('Error deleting banners:', error);
        }
    };

    const handleStatusUpdate = async (ids, status) => {
        try {
            await adminAction({
                url: '/admin/banners/update-status',
                method: 'POST',
                body: { ids, status },
                invalidates: [tagKey],
            }).unwrap();
            setSelectedIds([]);
        } catch (error) {
            console.error('Error updating banner status:', error);
        }
    };

    const columns = [
        {
            header: (
                <input
                    type="checkbox"
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedIds(banners.map((item) => item.id));
                        } else {
                            setSelectedIds([]);
                        }
                    }}
                />
            ),
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
                            setSelectedIds(selectedIds.filter((id) => id !== row.id));
                        }
                    }}
                />
            ),
        },
        {
            header: 'Image',
            accessor: 'image',
            width: '10%',
            render: (row) => (
                <img
                    src={row.image ? `/${row.image}` : 'https://via.placeholder.com/50'}
                    alt="Banner"
                    className="w-16 h-10 object-cover rounded"
                    onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/50';
                    }}
                />
            ),
        },
        { header: 'Title', accessor: 'title', width: '18%' },
        { header: 'Link', accessor: 'link', width: '28%' },
        {
            header: 'Status',
            accessor: 'status',
            width: '10%',
            render: (row) => (
                <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${Number(row.status) === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                >
                    {Number(row.status) === 1 ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            header: 'Actions',
            accessor: 'actions',
            width: '10%',
            render: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                        <FiEdit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete([row.id])}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="container-fluid">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Banners</h2>
                <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                    Add Banner
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-card p-4 mb-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by title or link..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="flex gap-2">
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
            </div>

            <div className="bg-white rounded-lg shadow-card">
                <DataTable columns={columns} data={banners} loading={loading} />
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Banner' : 'Add Banner'}>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                        <Input
                            value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                            required
                        >
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                        <input
                            type="file"
                            className="w-full"
                            onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                            required={!isEditing}
                        />
                        <p className="mt-1 text-xs text-gray-500">Recommended size: 1400 x 500 px</p>
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

export default BannerList;
