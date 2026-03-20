import React, { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import DataTable from './common/DataTable';
import Button from './common/Button';
import Modal from './common/Modal';
import Input from './common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../store/adminApi';
import { showConfirmAlert, showErrorMessage } from '../utils/alerts';

const GenericList = ({
    title,
    endpoint,
    columns,
    formFields,
    idField = 'id',
    nameField = 'name',
    singleRecordMode = false,
    getDeleteBlockReason,
    deleteInvalidates,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [selectedIds, setSelectedIds] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const tagKey = `list:${endpoint}`;
    const resolvedDeleteInvalidates = useMemo(() => {
        const extraTags = Array.isArray(deleteInvalidates)
            ? deleteInvalidates.filter((tag) => typeof tag === 'string' && tag.trim())
            : [];

        return Array.from(new Set([tagKey, ...extraTags]));
    }, [deleteInvalidates, tagKey]);

    const queryArgs = useMemo(() => ({
        url: endpoint,
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: [tagKey],
    }), [endpoint, keyword, pagination.current_page, tagKey]);

    const {
        data: response,
        isLoading,
        isFetching,
    } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();

    const data = response?.data || [];
    const loading = isLoading || isFetching;
    const hasRecords = Array.isArray(data) && data.length > 0;
    const canCreate = !singleRecordMode || !hasRecords;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        if (!canCreate) return;
        setIsEditing(false);
        setCurrentItem(null);
        setFormData({});
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setCurrentItem(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await adminAction({
                    url: `${endpoint}/${currentItem[idField]}`,
                    method: 'PUT',
                    body: formData,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                if (singleRecordMode && hasRecords) {
                    alert('Only one record is allowed here. Please edit the existing one.');
                    return;
                }
                await adminAction({
                    url: endpoint,
                    method: 'POST',
                    body: formData,
                    invalidates: [tagKey],
                }).unwrap();
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving:', error);
            alert(error?.data?.message || 'Error occurred');
        }
    };

    const handleDelete = async (ids) => {
        const normalizedIds = Array.isArray(ids) ? ids.filter((id) => id !== null && id !== undefined) : [];
        if (normalizedIds.length === 0) return;

        if (typeof getDeleteBlockReason === 'function') {
            const rowsToDelete = data.filter((item) => normalizedIds.includes(item[idField]));
            const deleteBlockReason = getDeleteBlockReason(rowsToDelete, normalizedIds);
            if (typeof deleteBlockReason === 'string' && deleteBlockReason.trim()) {
                showErrorMessage(deleteBlockReason.trim());
                return;
            }
        }

        const confirmed = await showConfirmAlert({
            title: 'Confirm Delete',
            content: normalizedIds.length > 1
                ? `Are you sure you want to delete these ${normalizedIds.length} items?`
                : 'Are you sure you want to delete this item?',
            okText: 'Yes, Delete',
            cancelText: 'Cancel',
            okType: 'danger',
        });
        if (!confirmed) return;

        try {
            await adminAction({
                url: `${endpoint}/delete`,
                method: 'DELETE',
                body: { [`${idField}s`]: normalizedIds },
                invalidates: resolvedDeleteInvalidates,
            }).unwrap();
            setSelectedIds([]);
        } catch (error) {
            console.error('Error deleting:', error);
            showErrorMessage(error?.data?.message || 'Error deleting records.');
        }
    };

    const handleStatusUpdate = async (ids, status) => {
        try {
            await adminAction({
                url: `${endpoint}/update-status`,
                method: 'POST',
                body: {
                    [`${idField}s`]: ids,
                    status,
                },
                invalidates: [tagKey],
            }).unwrap();
            setSelectedIds([]);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const enhancedColumns = [
        {
            header: <input type="checkbox" onChange={(e) => {
                if (e.target.checked) {
                    setSelectedIds(data.map(item => item[idField]));
                } else {
                    setSelectedIds([]);
                }
            }} />,
            accessor: 'checkbox',
            width: '5%',
            render: (row) => (
                <input
                    type="checkbox"
                    checked={selectedIds.includes(row[idField])}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedIds([...selectedIds, row[idField]]);
                        } else {
                            setSelectedIds(selectedIds.filter(id => id !== row[idField]));
                        }
                    }}
                />
            ),
        },
        ...columns,
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
                        onClick={() => handleDelete([row[idField]])}
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
            {/* Page Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                {canCreate ? (
                    <Button
                        onClick={handleCreate}
                        variant="primary"
                        icon={FiPlus}
                    >
                        Add New
                    </Button>
                ) : null}
            </div>

            {/* Search and Bulk Actions */}
            <div className="bg-white rounded-lg shadow-card p-4 mb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                        <Input
                            placeholder="Search..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
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

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-card">
                <DataTable
                    columns={enhancedColumns}
                    data={data}
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

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? `Edit ${title}` : `Add New ${title}`}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formFields.map((field) => (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {field.label}
                            </label>
                            {field.type === 'select' ? (
                                <select
                                    value={formData[field.name] ?? ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        [field.name]: e.target.value,
                                    })}
                                    required={field.required}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
                                >
                                    <option value="">Select {field.label}</option>
                                    {field.options?.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    value={formData[field.name] ?? ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        [field.name]: e.target.value,
                                    })}
                                    required={field.required}
                                    placeholder={field.placeholder}
                                    rows={field.rows || 6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
                                />
                            ) : (
                                <Input
                                    type={field.type || 'text'}
                                    value={formData[field.name] ?? ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        [field.name]: e.target.value,
                                    })}
                                    required={field.required}
                                    placeholder={field.placeholder}
                                />
                            )}
                        </div>
                    ))}

                    <div className="flex gap-3 justify-end pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
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

export default GenericList;
