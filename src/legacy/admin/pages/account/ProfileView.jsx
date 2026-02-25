import React, { useEffect, useRef, useState } from 'react';
import { FiSave, FiUploadCloud, FiUser, FiX } from 'react-icons/fi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';
import { resolveMediaUrl } from '../../../utils/media';

const ProfileView = () => {
    const { data: meResponse, isLoading, isFetching } = useAdminFetchQuery({
        url: '/admin/me',
        tags: ['me'],
    });
    const [adminAction] = useAdminActionMutation();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
    });
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imageError, setImageError] = useState('');
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [profileImagePath, setProfileImagePath] = useState('');
    const fileInputRef = useRef(null);

    const user = meResponse?.user || null;
    const avatarText = String(formData.name || user?.name || 'A').trim().charAt(0).toUpperCase() || 'A';
    const disabled = isLoading || isFetching || saving;

    useEffect(() => {
        if (!user) return;
        setFormData({
            name: user.name || '',
            email: user.email || '',
        });
    }, [user?.name, user?.email]);

    useEffect(() => {
        setProfileImagePath(user?.image || '');
    }, [user?.image]);

    useEffect(() => {
        if (!selectedImageFile) {
            setImagePreviewUrl(resolveMediaUrl(profileImagePath, ''));
            return undefined;
        }

        const objectUrl = URL.createObjectURL(selectedImageFile);
        setImagePreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedImageFile, profileImagePath]);

    const handleImageChange = (event) => {
        const nextFile = event.target.files?.[0];
        if (!nextFile) return;

        const mimeType = String(nextFile.type || '').toLowerCase();
        if (!mimeType.startsWith('image/')) {
            setImageError('Please select a valid image file.');
            return;
        }

        if (nextFile.size > 2 * 1024 * 1024) {
            setImageError('Image size must be 2MB or less.');
            return;
        }

        setImageError('');
        setSelectedImageFile(nextFile);
    };

    const clearSelectedImage = () => {
        setSelectedImageFile(null);
        setImageError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (imageError) {
            alert('Please fix image validation errors before saving.');
            return;
        }

        setSaving(true);

        try {
            const payload = new FormData();
            payload.append('name', String(formData.name || '').trim());
            payload.append('email', String(formData.email || '').trim());
            if (selectedImageFile) {
                payload.append('image', selectedImageFile);
            }

            const result = await adminAction({
                url: '/admin/profile',
                method: 'PUT',
                body: payload,
                invalidates: ['me', 'users'],
            }).unwrap();

            if (result?.user && typeof window !== 'undefined') {
                window.localStorage.setItem('user', JSON.stringify(result.user));
                window.dispatchEvent(new Event('storage'));
                setProfileImagePath(result.user.image || '');
            }

            clearSelectedImage();
        } catch (error) {
            alert(error?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container-fluid space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-admin-primary/10 text-admin-primary">
                    <FiUser className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
                    <p className="text-sm text-gray-500">View and update your account information</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-1">
                    <p className="text-xs uppercase tracking-widest text-gray-500">Account Info</p>
                    <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-admin-primary/20 bg-white">
                            {imagePreviewUrl ? (
                                <img src={imagePreviewUrl} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-admin-primary">{avatarText}</span>
                            )}
                        </div>
                        <div className="w-full space-y-2">
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-admin-primary px-3 py-2 text-sm font-medium text-admin-primary hover:bg-admin-primary hover:text-white">
                                <FiUploadCloud />
                                Upload Photo
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={disabled}
                                    onChange={handleImageChange}
                                />
                            </label>
                            {selectedImageFile ? (
                                <button
                                    type="button"
                                    onClick={clearSelectedImage}
                                    className="flex w-full items-center justify-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                    <FiX />
                                    Cancel New Photo
                                </button>
                            ) : null}
                            <p className="text-center text-xs text-gray-500">Recommended size: 400 x 400 px | JPG, PNG, WEBP | max 2MB</p>
                            {imageError ? <p className="text-center text-xs text-red-600">{imageError}</p> : null}
                        </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                        <p><span className="font-semibold text-gray-700">Role:</span> {user?.primary_role || user?.role || 'N/A'}</p>
                        <p><span className="font-semibold text-gray-700">Permissions:</span> {Array.isArray(user?.permissions) ? user.permissions.length : 0}</p>
                        <p><span className="font-semibold text-gray-700">Status:</span> Active</p>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Full Name"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            required
                            disabled={disabled}
                        />
                        <Input
                            type="email"
                            label="Email Address"
                            value={formData.email}
                            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                            required
                            disabled={disabled}
                        />

                        <div className="flex justify-end">
                            <Button type="submit" variant="primary" icon={FiSave} loading={saving}>
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
