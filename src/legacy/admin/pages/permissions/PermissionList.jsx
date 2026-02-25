import React, { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiKey, FiPlus, FiTrash2 } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { hasPermission } from '../../utils/rbac';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const normalizeSlug = (value = '') =>
    value
        .toLowerCase()
        .trim()
        .replace(/_/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-.]/g, '');

const PermissionList = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPermission, setCurrentPermission] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        module: '',
        action: 'view',
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const canCreate = hasPermission('permissions.create');
    const canEdit = hasPermission('permissions.edit');
    const canDelete = hasPermission('permissions.delete');

    const queryArgs = useMemo(() => ({
        url: '/admin/permissions',
        params: {
            keyword,
            module: moduleFilter,
            page: pagination.current_page,
            per_page: 30,
        },
        tags: ['permissions'],
    }), [keyword, moduleFilter, pagination.current_page]);

    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const permissions = response?.data || [];
    const loading = isLoading || isFetching;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const modules = useMemo(() => {
        if (Array.isArray(response?.modules) && response.modules.length > 0) {
            return [...new Set(response.modules.filter(Boolean))].sort();
        }

        const unique = new Set(
            permissions
                .map((item) => item.module)
                .filter((module) => Boolean(module))
        );
        return Array.from(unique).sort();
    }, [permissions, response?.modules]);

    const previewName = useMemo(() => {
        const module = normalizeSlug(formData.module);
        const action = normalizeSlug(formData.action);
        if (!module || !action) return '';
        return `${module}.${action}`;
    }, [formData.module, formData.action]);

    const handleCreate = () => {
        setIsEditing(false);
        setCurrentPermission(null);
        setFormError('');
        setFormData({ module: '', action: 'view' });
        setIsModalOpen(true);
    };

    const handleEdit = (permission) => {
        setIsEditing(true);
        setCurrentPermission(permission);
        setFormError('');
        setFormData({
            module: permission.module || '',
            action: permission.action || 'view',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        const module = normalizeSlug(formData.module);
        const action = normalizeSlug(formData.action);
        if (!module || !action) {
            setFormError('Module and action are required.');
            return;
        }

        const payload = { module, action };

        try {
            if (isEditing && currentPermission) {
                await adminAction({
                    url: `/admin/permissions/${currentPermission.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: ['permissions', 'roles'],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/permissions',
                    method: 'POST',
                    body: payload,
                    invalidates: ['permissions', 'roles'],
                }).unwrap();
            }

            setIsModalOpen(false);
        } catch (error) {
            setFormError(error?.data?.message || 'Failed to save permission.');
        }
    };

    const handleDelete = async (permission) => {
        if (!window.confirm(`Delete permission "${permission.name}"?`)) return;

        try {
            await adminAction({
                url: `/admin/permissions/${permission.id}`,
                method: 'DELETE',
                invalidates: ['permissions', 'roles'],
            }).unwrap();
        } catch (error) {
            alert(error?.data?.message || 'Failed to delete permission.');
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '8%' },
        { header: 'Permission Key', accessor: 'name', width: '34%' },
        {
            header: 'Module',
            accessor: 'module',
            width: '16%',
            render: (row) => (
                <span className="rounded-full bg-admin-primary/10 px-3 py-1 text-xs font-semibold text-admin-primary">
                    {row.module}
                </span>
            ),
        },
        { header: 'Action', accessor: 'action', width: '12%' },
        { header: 'Assigned Roles', accessor: 'roles_count', width: '14%' },
        {
            header: 'Actions',
            accessor: 'actions',
            width: '16%',
            render: (row) => (
                <div className="flex gap-2">
                    {canEdit && (
                        <button
                            onClick={() => handleEdit(row)}
                            className="rounded p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            title="Edit"
                        >
                            <FiEdit2 size={16} />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => handleDelete(row)}
                            className="rounded p-2 text-red-600 transition-colors hover:bg-red-50"
                            title="Delete"
                        >
                            <FiTrash2 size={16} />
                        </button>
                    )}
                    {!canEdit && !canDelete && <span className="text-xs text-gray-400">Restricted</span>}
                </div>
            ),
        },
    ];

    return (
        <div className="container-fluid">
            <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-admin-primary/10 text-admin-primary">
                        <FiKey className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Permissions</h2>
                        <p className="text-sm text-gray-500">Manage module/action permission keys</p>
                    </div>
                </div>
                {canCreate && (
                    <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                        Add Permission
                    </Button>
                )}
            </div>

            <div className="mb-4 grid gap-3 rounded-lg bg-white p-4 shadow-card md:grid-cols-2">
                <Input
                    placeholder="Search permission key..."
                    value={keyword}
                    onChange={(e) => {
                        setPagination((prev) => ({ ...prev, current_page: 1 }));
                        setKeyword(e.target.value);
                    }}
                />
                <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    value={moduleFilter}
                    onChange={(e) => {
                        setPagination((prev) => ({ ...prev, current_page: 1 }));
                        setModuleFilter(e.target.value);
                    }}
                >
                    <option value="">All modules</option>
                    {modules.map((module) => (
                        <option key={module} value={module}>{module}</option>
                    ))}
                </select>
            </div>

            <div className="rounded-lg bg-white shadow-card">
                <DataTable
                    columns={columns}
                    data={permissions}
                    loading={loading}
                    pagination={pagination}
                    onPageChange={(page) => setPagination((prev) => ({ ...prev, current_page: page }))}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Edit Permission' : 'Create Permission'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

                    <Input
                        label="Module"
                        placeholder="e.g. orders, users, reports"
                        value={formData.module}
                        onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                        required
                    />

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Action</label>
                        <input
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                            placeholder="e.g. view, create, edit, delete"
                            value={formData.action}
                            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                            required
                        />
                    </div>

                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        Permission key preview: <span className="font-semibold">{previewName || '-'}</span>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {isEditing ? 'Update Permission' : 'Create Permission'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PermissionList;
