import React, { useState } from 'react';
import { FiLock, FiSave } from 'react-icons/fi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAdminActionMutation } from '../../../store/adminApi';

const AccountSettings = () => {
    const [adminAction] = useAdminActionMutation();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (formData.password !== formData.password_confirmation) {
            alert('New password and confirmation do not match.');
            return;
        }

        setSaving(true);
        try {
            await adminAction({
                url: '/admin/profile/password',
                method: 'PUT',
                body: formData,
            }).unwrap();

            setFormData({
                current_password: '',
                password: '',
                password_confirmation: '',
            });
        } catch (error) {
            alert(error?.data?.message || 'Failed to change password.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container-fluid space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-admin-primary/10 text-admin-primary">
                    <FiLock className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
                    <p className="text-sm text-gray-500">Change your login password</p>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 lg:max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="password"
                        label="Current Password"
                        value={formData.current_password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, current_password: e.target.value }))}
                        required
                        disabled={saving}
                    />
                    <Input
                        type="password"
                        label="New Password"
                        value={formData.password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                        minLength={8}
                        disabled={saving}
                    />
                    <Input
                        type="password"
                        label="Confirm New Password"
                        value={formData.password_confirmation}
                        onChange={(e) => setFormData((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                        required
                        minLength={8}
                        disabled={saving}
                    />

                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                        Password must be at least 8 characters.
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" variant="primary" icon={FiSave} loading={saving}>
                            Update Password
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountSettings;
