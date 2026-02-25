import React, { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import RichTextEditor, { richTextToPlainText } from '../../components/common/RichTextEditor';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const hasRichTextContent = (value) => richTextToPlainText(value).length > 0;

const CreatePageSettings = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPage, setCurrentPage] = useState(null);
    const [descriptionError, setDescriptionError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [formData, setFormData] = useState({
        name: '',
        title: '',
        description: '',
        footer_section: 'useful',
        footer_sort_order: 0,
        status: 1,
    });

    const tagKey = 'pages';
    const queryArgs = useMemo(() => ({
        url: '/admin/pages',
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: [tagKey],
    }), [keyword, pagination.current_page]);
    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const pages = response?.data || [];
    const loading = isLoading || isFetching;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        setIsEditing(false);
        setCurrentPage(null);
        setDescriptionError('');
        setFormData({
            name: '',
            title: '',
            description: '',
            footer_section: 'useful',
            footer_sort_order: 0,
            status: 1,
        });
        setIsModalOpen(true);
    };

    const handleEdit = (page) => {
        setIsEditing(true);
        setCurrentPage(page);
        setDescriptionError('');
        setFormData({
            name: page.name || '',
            title: page.title || '',
            description: page.description || '',
            footer_section: page.footer_section || 'useful',
            footer_sort_order: Number(page.footer_sort_order ?? 0),
            status: Number(page.status ?? 1),
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hasRichTextContent(formData.description)) {
            setDescriptionError('Description is required');
            return;
        }

        setDescriptionError('');
        try {
            const payload = {
                name: formData.name,
                title: formData.title,
                description: formData.description,
                footer_section: formData.footer_section || 'useful',
                footer_sort_order: Number(formData.footer_sort_order ?? 0),
                status: Number(formData.status),
            };

            if (isEditing && currentPage) {
                await adminAction({
                    url: `/admin/pages/${currentPage.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/pages',
                    method: 'POST',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving page:', error);
            alert(error?.data?.message || 'Failed to save page');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete?')) return;
        try {
            await adminAction({
                url: '/admin/pages/delete',
                method: 'DELETE',
                body: { ids: [id] },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error deleting page:', error);
        }
    };

    const handleStatus = async (id, makeActive) => {
        try {
            await adminAction({
                url: '/admin/pages/update-status',
                method: 'POST',
                body: {
                    ids: [id],
                    status: makeActive ? 1 : 0,
                },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error updating page status:', error);
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '6%' },
        { header: 'Name', accessor: 'name', width: '20%' },
        { header: 'Title', accessor: 'title', width: '24%' },
        {
            header: 'Footer Section',
            accessor: 'footer_section',
            width: '12%',
            render: (row) => {
                const section = String(row.footer_section || 'useful');
                const label = section === 'reference'
                    ? 'References'
                    : section === 'none'
                        ? 'Hidden'
                        : 'Useful Links';

                const classes = section === 'reference'
                    ? 'bg-indigo-100 text-indigo-700'
                    : section === 'none'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-sky-100 text-sky-700';

                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>
                        {label}
                    </span>
                );
            },
        },
        {
            header: 'Order',
            accessor: 'footer_sort_order',
            width: '8%',
            render: (row) => Number(row.footer_sort_order ?? 0),
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
            width: '20%',
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
                <h2 className="text-2xl font-bold text-gray-900">Footer Links</h2>
                <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                    Configuration
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
                <DataTable columns={columns} data={pages} loading={loading} />
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
                title={isEditing ? 'Edit Page' : 'Add Page'}
                size="large"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <RichTextEditor
                            value={formData.description}
                            onChange={(value) => {
                                setFormData({ ...formData, description: value });
                                if (descriptionError && hasRichTextContent(value)) {
                                    setDescriptionError('');
                                }
                            }}
                            placeholder="Write page description..."
                            minHeight={220}
                        />
                        {descriptionError ? (
                            <p className="mt-1 text-sm text-red-600">{descriptionError}</p>
                        ) : null}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Footer Section</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={formData.footer_section}
                            onChange={(e) => setFormData({ ...formData, footer_section: e.target.value })}
                        >
                            <option value="useful">Useful Links</option>
                            <option value="reference">References</option>
                            <option value="none">Hidden (Do not show in footer)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Footer Sort Order</label>
                        <Input
                            type="number"
                            min={0}
                            value={formData.footer_sort_order}
                            onChange={(e) => setFormData({
                                ...formData,
                                footer_sort_order: Number(e.target.value || 0),
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

export default CreatePageSettings;
