import React, { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const ContactSettings = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentContact, setCurrentContact] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [formData, setFormData] = useState({
        hotline: '',
        email: '',
        address: '',
        maplink: '',
        status: 1,
    });

    const tagKey = 'contacts';
    const queryArgs = useMemo(() => ({
        url: '/admin/contacts',
        params: {
            keyword,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: [tagKey],
    }), [keyword, pagination.current_page]);
    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const contacts = response?.data || [];
    const loading = isLoading || isFetching;
    const hasContact = contacts.length > 0;
    const canCreateContact = !hasContact;

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleCreate = () => {
        if (!canCreateContact) return;
        setIsEditing(false);
        setCurrentContact(null);
        setFormData({
            hotline: '',
            email: '',
            address: '',
            maplink: '',
            status: 1,
        });
        setIsModalOpen(true);
    };

    const handleEdit = (contact) => {
        setIsEditing(true);
        setCurrentContact(contact);
        setFormData({
            hotline: contact.hotline || '',
            email: contact.email || '',
            address: contact.address || '',
            maplink: contact.maplink || '',
            status: Number(contact.status ?? 1),
        });
        setIsModalOpen(true);
    };

    const buildPayload = () => {
        return {
            hotline: String(formData.hotline || '').trim(),
            email: String(formData.email || '').trim(),
            address: String(formData.address || '').trim(),
            maplink: String(formData.maplink || '').trim(),
            status: Number(formData.status),
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = buildPayload();
            if (isEditing && currentContact) {
                await adminAction({
                    url: `/admin/contacts/${currentContact.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                if (hasContact) {
                    alert('Contact setting already exists. Please edit the existing one.');
                    return;
                }
                await adminAction({
                    url: '/admin/contacts',
                    method: 'POST',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving contact:', error);
            alert(error?.data?.message || 'Failed to save contact');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete?')) return;
        try {
            await adminAction({
                url: '/admin/contacts/delete',
                method: 'DELETE',
                body: { ids: [id] },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error deleting contact:', error);
        }
    };

    const handleStatus = async (id, makeActive) => {
        try {
            await adminAction({
                url: '/admin/contacts/update-status',
                method: 'POST',
                body: {
                    ids: [id],
                    status: makeActive ? 1 : 0,
                },
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error updating contact status:', error);
        }
    };

    const columns = [
        { header: 'ID', accessor: 'id', width: '6%' },
        { header: 'Hotline', accessor: 'hotline', width: '25%' },
        { header: 'Email', accessor: 'email', width: '25%' },
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
                <h2 className="text-2xl font-bold text-gray-900">Contact Settings</h2>
                {canCreateContact ? (
                    <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                        Add Contact
                    </Button>
                ) : null}
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
                <DataTable columns={columns} data={contacts} loading={loading} />
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
                title={isEditing ? 'Edit Contact' : 'Add Contact'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hotline Number</label>
                        <Input
                            value={formData.hotline}
                            onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <Input
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Map</label>
                        <Input
                            value={formData.maplink}
                            onChange={(e) => setFormData({ ...formData, maplink: e.target.value })}
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

export default ContactSettings;
