import React, { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiUser } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { formatDateTime } from '../../utils/helpers';
import { hasPermission } from '../../utils/rbac';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const UserList = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role_id: '',
        password: '',
        password_confirmation: '',
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const canCreate = hasPermission('users.create');
    const canEdit = hasPermission('users.edit');
    const canDelete = hasPermission('users.delete');

    const queryArgs = useMemo(() => ({
        url: '/admin/users',
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: ['users', 'roles'],
    }), [keyword, pagination.current_page]);

    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const users = response?.data || [];
    const roles = response?.roles || [];
    const loading = isLoading || isFetching;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        setIsEditing(false);
        setCurrentUser(null);
        setFormError('');
        setFormData({
            name: '',
            email: '',
            role_id: '',
            password: '',
            password_confirmation: '',
        });
        setIsModalOpen(true);
    };

    const handleEdit = (user) => {
        setIsEditing(true);
        setCurrentUser(user);
        setFormError('');
        setFormData({
            name: user.name || '',
            email: user.email || '',
            role_id: user.role_ids?.[0] ? String(user.role_ids[0]) : '',
            password: '',
            password_confirmation: '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!formData.role_id) {
            setFormError('Role is required.');
            return;
        }

        if (!isEditing && !formData.password) {
            setFormError('Password is required.');
            return;
        }

        const payload = {
            name: formData.name,
            email: formData.email,
            role_id: Number(formData.role_id),
        };

        if (formData.password) {
            payload.password = formData.password;
            payload.password_confirmation = formData.password_confirmation;
        }

        try {
            if (isEditing && currentUser) {
                await adminAction({
                    url: `/admin/users/${currentUser.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: ['users'],
                }).unwrap();
            } else {
                await adminAction({
                    url: '/admin/users',
                    method: 'POST',
                    body: payload,
                    invalidates: ['users'],
                }).unwrap();
            }

            setIsModalOpen(false);
        } catch (error) {
            setFormError(error?.data?.message || 'Failed to save employee.');
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Delete employee "${user.name}"?`)) return;

        try {
            await adminAction({
                url: `/admin/users/${user.id}`,
                method: 'DELETE',
                invalidates: ['users'],
            }).unwrap();
        } catch (error) {
            alert(error?.data?.message || 'Failed to delete employee.');
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '6%' },
        { header: 'Name', accessor: 'name', width: '20%' },
        { header: 'Email', accessor: 'email', width: '24%' },
        {
            header: 'Role',
            accessor: 'primary_role',
            width: '14%',
            render: (row) => (
                <span className="inline-flex rounded-full bg-admin-primary/10 px-3 py-1 text-xs font-semibold text-admin-primary">
                    {row.primary_role || 'Unassigned'}
                </span>
            ),
        },
        {
            header: 'Permissions',
            accessor: 'permissions_count',
            width: '10%',
            render: (row) => row.permissions_count || 0,
        },
        {
            header: 'Created',
            accessor: 'created_at',
            width: '14%',
            render: (row) => (row.created_at ? formatDateTime(row.created_at) : '-'),
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
                        <FiUser className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
                        <p className="text-sm text-gray-500">Manage employee accounts and role assignments</p>
                    </div>
                </div>
                {canCreate && (
                    <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                        Add Employee
                    </Button>
                )}
            </div>

            <div className="mb-4 rounded-lg bg-white p-4 shadow-card">
                <Input
                    placeholder="Search by name or email..."
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
                    data={users}
                    loading={loading}
                    pagination={pagination}
                    onPageChange={(page) => setPagination((prev) => ({ ...prev, current_page: page }))}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? 'Edit Employee' : 'Create Employee'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

                    {roles.length === 0 && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            No roles available. Create a role first.
                        </div>
                    )}

                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                        <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                            value={formData.role_id}
                            onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                            required
                        >
                            <option value="">Select role</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label={isEditing ? 'Password (optional)' : 'Password'}
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!isEditing}
                    />
                    <Input
                        label={isEditing ? 'Confirm Password (optional)' : 'Confirm Password'}
                        type="password"
                        value={formData.password_confirmation}
                        onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                        required={!isEditing}
                    />

                    <div className="flex justify-end gap-3 pt-3">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={roles.length === 0}>
                            {isEditing ? 'Update Employee' : 'Create Employee'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UserList;
