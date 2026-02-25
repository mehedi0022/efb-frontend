import React, { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiShield, FiTrash2 } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { hasPermission } from '../../utils/rbac';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const groupPermissionsByModule = (permissions = []) =>
    permissions.reduce((acc, permission) => {
        const moduleKey = permission.module || 'custom';
        if (!acc[moduleKey]) acc[moduleKey] = [];
        acc[moduleKey].push(permission);
        return acc;
    }, {});

const toTitle = (value = '') =>
    value
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

const RoleList = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRole, setCurrentRole] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        permission_ids: [],
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const canCreate = hasPermission('roles.create');
    const canEdit = hasPermission('roles.edit');
    const canDelete = hasPermission('roles.delete');

    const queryArgs = useMemo(() => ({
        url: '/admin/roles',
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: ['roles', 'permissions'],
    }), [keyword, pagination.current_page]);

    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const roles = response?.data || [];
    const permissions = response?.permissions || [];
    const loading = isLoading || isFetching;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const groupedPermissions = useMemo(
        () => groupPermissionsByModule(permissions),
        [permissions]
    );

    const handleCreate = () => {
        setIsEditing(false);
        setCurrentRole(null);
        setFormError('');
        setFormData({ name: '', permission_ids: [] });
        setIsModalOpen(true);
    };

    const handleEdit = (role) => {
        setIsEditing(true);
        setCurrentRole(role);
        setFormError('');
        setFormData({
            name: role.name || '',
            permission_ids: Array.isArray(role.permission_ids) ? role.permission_ids : [],
        });
        setIsModalOpen(true);
    };

    const togglePermission = (permissionId) => {
        setFormData((prev) => {
            const exists = prev.permission_ids.includes(permissionId);
            return {
                ...prev,
                permission_ids: exists
                    ? prev.permission_ids.filter((id) => id !== permissionId)
                    : [...prev.permission_ids, permissionId],
            };
        });
    };

    const toggleModulePermissions = (modulePermissions) => {
        const ids = modulePermissions.map((item) => item.id);

        setFormData((prev) => {
            const allSelected = ids.every((id) => prev.permission_ids.includes(id));
            return {
                ...prev,
                permission_ids: allSelected
                    ? prev.permission_ids.filter((id) => !ids.includes(id))
                    : [...new Set([...prev.permission_ids, ...ids])],
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!formData.name.trim()) {
            setFormError('Role name is required.');
            return;
        }

        const payload = {
            name: formData.name.trim(),
            permission_ids: formData.permission_ids,
        };

        try {
            if (isEditing && currentRole) {
                await adminAction({
                    url: `/admin/roles/${currentRole.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: ['roles', 'users'],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/roles',
                    method: 'POST',
                    body: payload,
                    invalidates: ['roles', 'users'],
                }).unwrap();
            }

            setIsModalOpen(false);
        } catch (error) {
            setFormError(error?.data?.message || 'Failed to save role.');
        }
    };

    const handleDelete = async (role) => {
        if (!window.confirm(`Delete role "${role.name}"?`)) return;

        try {
            await adminAction({
                url: `/admin/roles/${role.id}`,
                method: 'DELETE',
                invalidates: ['roles', 'users'],
            }).unwrap();
        } catch (error) {
            alert(error?.data?.message || 'Failed to delete role.');
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '7%' },
        { header: 'Role Name', accessor: 'name', width: '24%' },
        {
            header: 'Permissions',
            accessor: 'permissions_count',
            width: '12%',
            render: (row) => row.permissions_count || 0,
        },
        {
            header: 'Employees',
            accessor: 'users_count',
            width: '12%',
            render: (row) => row.users_count || 0,
        },
        {
            header: 'Permission Keys',
            accessor: 'permissions',
            width: '33%',
            render: (row) => (
                <div className="flex flex-wrap gap-1">
                    {(row.permissions || []).slice(0, 4).map((permissionName) => (
                        <span
                            key={permissionName}
                            className="inline-flex rounded-full bg-admin-primary/10 px-2 py-0.5 text-[11px] font-medium text-admin-primary"
                        >
                            {permissionName}
                        </span>
                    ))}
                    {(row.permissions || []).length > 4 && (
                        <span className="text-xs text-gray-500">+{(row.permissions || []).length - 4} more</span>
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
                        <FiShield className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Roles</h2>
                        <p className="text-sm text-gray-500">Create roles and assign module-level permissions</p>
                    </div>
                </div>
                {canCreate && (
                    <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                        Add Role
                    </Button>
                )}
            </div>

            <div className="mb-4 rounded-lg bg-white p-4 shadow-card">
                <Input
                    placeholder="Search roles..."
                    value={keyword}
                    onChange={(e) => {
                        setPagination((prev) => ({ ...prev, current_page: 1 }));
                        setKeyword(e.target.value);
                    }}
                />
            </div>

            <div className="rounded-lg bg-white shadow-card">
                <DataTable
                    columns={columns}
                    data={roles}
                    loading={loading}
                    pagination={pagination}
                    onPageChange={(page) => setPagination((prev) => ({ ...prev, current_page: page }))}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Edit Role' : 'Create Role'}
                size="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

                    <Input
                        label="Role Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                        <div className="mb-2 text-sm font-semibold text-gray-700">Permissions</div>
                        <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
                            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                                const allSelected = modulePermissions.every((item) =>
                                    formData.permission_ids.includes(item.id)
                                );

                                return (
                                    <div key={module} className="rounded-md border border-gray-200 bg-white p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-800">{toTitle(module)}</p>
                                            <button
                                                type="button"
                                                onClick={() => toggleModulePermissions(modulePermissions)}
                                                className="text-xs text-admin-primary hover:underline"
                                            >
                                                {allSelected ? 'Unselect all' : 'Select all'}
                                            </button>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {modulePermissions.map((permission) => (
                                                <label
                                                    key={permission.id}
                                                    className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-700 hover:border-admin-primary/40"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.permission_ids.includes(permission.id)}
                                                        onChange={() => togglePermission(permission.id)}
                                                    />
                                                    <span>{toTitle(permission.action)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {isEditing ? 'Update Role' : 'Create Role'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RoleList;
