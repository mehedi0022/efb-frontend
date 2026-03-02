import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiUploadCloud, FiImage } from 'react-icons/fi';
import { Upload } from 'antd';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';
import { resolveMediaUrl } from '../../../utils/media';

const MAX_IMAGE_SIZE_BYTES = 500 * 1024;
const MAX_IMAGE_SIZE_LABEL = '500KB';

const validateImageFile = async (file, config) => {
    if (!file) return null;

    const mimeType = String(file.type || '').toLowerCase();
    const extension = String(file.name || '')
        .split('.')
        .pop()
        .toLowerCase();
    const knownImageExtensions = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'webp',
        'svg',
        'ico',
        'avif',
        'tif',
        'tiff',
        'heic',
        'heif',
        'jfif',
    ];

    const isMimeImage = mimeType.startsWith('image/');
    const isKnownImageExtension = knownImageExtensions.includes(extension);

    if (!isMimeImage && !isKnownImageExtension) {
        return `${config.label} must be an image file.`;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return `${config.label} exceeds the maximum size (${MAX_IMAGE_SIZE_LABEL}).`;
    }

    return null;
};

const makeExistingFileList = (url, keyPrefix) => {
    const resolvedUrl = resolveMediaUrl(url, '');
    if (!resolvedUrl) return [];

    return [{
        uid: `${keyPrefix}-existing`,
        name: `${keyPrefix}.png`,
        status: 'done',
        url: resolvedUrl,
    }];
};

const BUTTON_COLOR_ROWS = [
    {
        key: 'primary',
        title: 'Primary Button',
        fields: [
            { key: 'button_primary_color', label: 'Background', fallback: '#111827', placeholder: '#111827' },
            { key: 'button_secondary_color', label: 'Hover', fallback: '#374151', placeholder: '#374151' },
            { key: 'button_primary_text_color', label: 'Text', fallback: '#ffffff', placeholder: '#ffffff' },
        ],
    },
    {
        key: 'secondary',
        title: 'Secondary Button',
        fields: [
            { key: 'button_secondary_bg_color', label: 'Background', fallback: '#374151', placeholder: '#374151' },
            { key: 'button_secondary_hover_color', label: 'Hover', fallback: '#1f2937', placeholder: '#1f2937' },
            { key: 'button_secondary_text_color', label: 'Text', fallback: '#ffffff', placeholder: '#ffffff' },
        ],
    },
    {
        key: 'info',
        title: 'Info Button',
        fields: [
            { key: 'button_info_bg_color', label: 'Background', fallback: '#0ea5e9', placeholder: '#0ea5e9' },
            { key: 'button_info_hover_color', label: 'Hover', fallback: '#0284c7', placeholder: '#0284c7' },
            { key: 'button_info_text_color', label: 'Text', fallback: '#ffffff', placeholder: '#ffffff' },
        ],
    },
];

const GeneralSettings = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSetting, setCurrentSetting] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        browser_tab_title: '',
        description: '',
        header_bg_color: '',
        footer_bg_color: '',
        button_primary_color: '',
        button_secondary_color: '',
        button_primary_text_color: '',
        button_secondary_bg_color: '',
        button_secondary_hover_color: '',
        button_secondary_text_color: '',
        button_info_bg_color: '',
        button_info_hover_color: '',
        button_info_text_color: '',
        fb_link: '',
        hotline: '',
        whatsapp: '',
        messenger: '',
        footer_payment_enabled: 1,
        is_stock_visible: 1,
        status: 1,
        logo: null,
        favicon: null,
    });
    const [fileErrors, setFileErrors] = useState({ logo: '', favicon: '' });
    const [uploadFileLists, setUploadFileLists] = useState({ logo: [], favicon: [] });

    const tagKey = 'settings';
    const {
        data: response,
        isLoading,
        isFetching,
    } = useAdminFetchQuery({ url: '/admin/settings', tags: [tagKey] });
    const [adminAction] = useAdminActionMutation();
    const allSettings = Array.isArray(response?.data) ? response.data : [];
    const settings = allSettings.length > 0 ? [allSettings[0]] : [];
    const loading = isLoading || isFetching;
    const hasSetting = settings.length > 0;
    const canCreateSetting = !hasSetting;

    const resetForm = () => {
        setFormData({
            name: '',
            browser_tab_title: '',
            description: '',
            header_bg_color: '',
            footer_bg_color: '',
            button_primary_color: '',
            button_secondary_color: '',
            button_primary_text_color: '',
            button_secondary_bg_color: '',
            button_secondary_hover_color: '',
            button_secondary_text_color: '',
            button_info_bg_color: '',
            button_info_hover_color: '',
            button_info_text_color: '',
            fb_link: '',
            hotline: '',
            whatsapp: '',
            messenger: '',
            footer_payment_enabled: 1,
            is_stock_visible: 1,
            status: 1,
            logo: null,
            favicon: null,
        });
        setFileErrors({ logo: '', favicon: '' });
        setUploadFileLists({ logo: [], favicon: [] });
    };

    const handleCreate = () => {
        if (!canCreateSetting) return;
        setIsEditing(false);
        setCurrentSetting(null);
        resetForm();
        setIsModalOpen(true);
    };

    const handleEdit = (setting) => {
        setIsEditing(true);
        setCurrentSetting(setting);
        setFormData({
            name: setting.name || '',
            browser_tab_title: setting.browser_tab_title || '',
            description: setting.description || '',
            header_bg_color: setting.header_bg_color || '',
            footer_bg_color: setting.footer_bg_color || '',
            button_primary_color: setting.button_primary_color || '',
            button_secondary_color: setting.button_secondary_color || '',
            button_primary_text_color: setting.button_primary_text_color || '',
            button_secondary_bg_color: setting.button_secondary_bg_color || '',
            button_secondary_hover_color: setting.button_secondary_hover_color || '',
            button_secondary_text_color: setting.button_secondary_text_color || '',
            button_info_bg_color: setting.button_info_bg_color || '',
            button_info_hover_color: setting.button_info_hover_color || '',
            button_info_text_color: setting.button_info_text_color || '',
            fb_link: setting.fb_link || '',
            hotline: setting.hotline || '',
            whatsapp: setting.whatsapp || '',
            messenger: setting.messenger || '',
            footer_payment_enabled: Number(setting.footer_payment_enabled ?? 1),
            is_stock_visible: Number(setting.is_stock_visible ?? 1),
            status: setting.status ?? 1,
            logo: null,
            favicon: null,
        });
        setFileErrors({ logo: '', favicon: '' });
        setUploadFileLists({
            logo: makeExistingFileList(setting.logo, 'logo'),
            favicon: makeExistingFileList(setting.favicon, 'favicon'),
        });
        setIsModalOpen(true);
    };

    const handleUploadChange = (field, fileList) => {
        const latestFileList = (fileList || []).slice(-1);
        const latestFile = latestFileList[0]?.originFileObj || null;

        if (!latestFileList.length) {
            setFormData((prev) => ({ ...prev, [field]: null }));
            setFileErrors((prev) => ({ ...prev, [field]: '' }));
            setUploadFileLists((prev) => ({ ...prev, [field]: [] }));
            return;
        }

        setUploadFileLists((prev) => ({ ...prev, [field]: latestFileList }));
        setFormData((prev) => ({ ...prev, [field]: latestFile }));
        setFileErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const createBeforeUpload = (field, label) => async (file) => {
        const validationMessage = await validateImageFile(file, { label });
        if (validationMessage) {
            setFileErrors((prev) => ({ ...prev, [field]: validationMessage }));
            return Upload.LIST_IGNORE;
        }
        setFileErrors((prev) => ({ ...prev, [field]: '' }));
        return false;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (fileErrors.logo || fileErrors.favicon) {
            alert('Please fix file validation errors before submitting.');
            return;
        }

        try {
            const payload = new FormData();
            payload.append('name', formData.name);
            payload.append('browser_tab_title', formData.browser_tab_title || '');
            payload.append('description', formData.description || '');
            payload.append('header_bg_color', formData.header_bg_color || '');
            payload.append('footer_bg_color', formData.footer_bg_color || '');
            payload.append('button_primary_color', formData.button_primary_color || '');
            payload.append('button_secondary_color', formData.button_secondary_color || '');
            payload.append('button_primary_text_color', formData.button_primary_text_color || '');
            payload.append('button_secondary_bg_color', formData.button_secondary_bg_color || '');
            payload.append('button_secondary_hover_color', formData.button_secondary_hover_color || '');
            payload.append('button_secondary_text_color', formData.button_secondary_text_color || '');
            payload.append('button_info_bg_color', formData.button_info_bg_color || '');
            payload.append('button_info_hover_color', formData.button_info_hover_color || '');
            payload.append('button_info_text_color', formData.button_info_text_color || '');
            payload.append('fb_link', formData.fb_link || '');
            payload.append('hotline', formData.hotline || '');
            payload.append('whatsapp', formData.whatsapp || '');
            payload.append('messenger', formData.messenger || '');
            payload.append('footer_payment_enabled', String(Number(formData.footer_payment_enabled ?? 1)));
            payload.append('is_stock_visible', String(Number(formData.is_stock_visible ?? 1)));
            payload.append('status', String(formData.status));

            if (formData.logo) {
                payload.append('logo', formData.logo);
            }
            if (formData.favicon) {
                payload.append('favicon', formData.favicon);
            }

            if (isEditing && currentSetting) {
                await adminAction({
                    url: `/admin/settings/${currentSetting.id}`,
                    method: 'PUT',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            } else {
                if (hasSetting) {
                    alert('General setting already exists. Please edit the existing one.');
                    return;
                }
                await adminAction({
                    url: '/admin/settings',
                    method: 'POST',
                    body: payload,
                    invalidates: [tagKey],
                }).unwrap();
            }

            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert(error?.data?.message || 'Failed to save settings');
        }
    };

    const columns = [
        { header: 'Name', accessor: 'name', width: '30%' },
        {
            header: 'Browser Tab Title',
            accessor: 'browser_tab_title',
            width: '20%',
            render: (row) => row.browser_tab_title || '-',
        },
        {
            header: 'Courier Charge',
            accessor: 'courier_charge',
            width: '10%',
            render: (row) => (
                <span className="font-semibold text-gray-700">
                    {Number(row.courier_charge ?? 0)}
                </span>
            ),
        },
        {
            header: 'Logo',
            accessor: 'logo',
            width: '10%',
            render: (row) => (
                <img
                    src={resolveMediaUrl(row.logo, 'https://via.placeholder.com/80x24')}
                    alt="Logo"
                    className="h-10 w-20 object-contain"
                />
            ),
        },
        {
            header: 'Favicon',
            accessor: 'favicon',
            width: '8%',
            render: (row) => (
                <img
                    src={resolveMediaUrl(row.favicon, 'https://via.placeholder.com/32')}
                    alt="Favicon"
                    className="h-8 w-8 object-contain"
                />
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            width: '8%',
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
            header: 'Show Stock',
            accessor: 'is_stock_visible',
            width: '12%',
            render: (row) => (
                <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        Number(row.is_stock_visible ?? 1) === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-700'
                    }`}
                >
                    {Number(row.is_stock_visible ?? 1) === 1 ? 'Visible' : 'Hidden'}
                </span>
            ),
        },
        {
            header: 'Footer Payment',
            accessor: 'footer_payment_enabled',
            width: '12%',
            render: (row) => (
                <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        Number(row.footer_payment_enabled ?? 1) === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-700'
                    }`}
                >
                    {Number(row.footer_payment_enabled ?? 1) === 1 ? 'Active' : 'Inactive'}
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
                </div>
            ),
        },
    ];

    return (
        <div className="container-fluid admin-settings-page">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
                {canCreateSetting ? (
                    <Button onClick={handleCreate} variant="primary" icon={FiPlus}>
                        Add Setting
                    </Button>
                ) : null}
            </div>

            <div className="bg-white rounded-lg shadow-card">
                <DataTable columns={columns} data={settings} loading={loading} />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="2xl"
                title={
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FiImage className="text-[#1f4ea3]" />
                            <span>{isEditing ? 'Edit General Setting' : 'Add General Setting'}</span>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            Premium Setup
                        </span>
                    </div>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-[#f8fbff] p-4">
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Basic Information</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Browser Tab Title</label>
                                <Input
                                    value={formData.browser_tab_title}
                                    onChange={(e) => setFormData({ ...formData, browser_tab_title: e.target.value })}
                                    placeholder="Shown in browser tab"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                                >
                                    <option value={1}>Active</option>
                                    <option value={0}>Inactive</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Header Notice (Marquee)</label>
                                <textarea
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Header marquee text or HTML"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Color Configuration</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Header Background Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formData.header_bg_color || '#ffffff'}
                                        onChange={(e) => setFormData({ ...formData, header_bg_color: e.target.value })}
                                        className="h-10 w-14 rounded border border-gray-300 p-1"
                                    />
                                    <Input
                                        value={formData.header_bg_color}
                                        onChange={(e) => setFormData({ ...formData, header_bg_color: e.target.value })}
                                        placeholder="#ffffff"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Footer Background Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formData.footer_bg_color || '#ffffff'}
                                        onChange={(e) => setFormData({ ...formData, footer_bg_color: e.target.value })}
                                        className="h-10 w-14 rounded border border-gray-300 p-1"
                                    />
                                    <Input
                                        value={formData.footer_bg_color}
                                        onChange={(e) => setFormData({ ...formData, footer_bg_color: e.target.value })}
                                        placeholder="#ffffff"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 rounded-lg border border-gray-200">
                            <div className="hidden grid-cols-[180px_repeat(3,minmax(0,1fr))] gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 md:grid">
                                <span>Button Variant</span>
                                <span>Background</span>
                                <span>Hover</span>
                                <span>Text</span>
                            </div>

                            <div className="space-y-0">
                                {BUTTON_COLOR_ROWS.map((row) => (
                                    <div
                                        key={row.key}
                                        className="grid grid-cols-1 gap-3 border-b border-gray-100 px-3 py-3 last:border-b-0 md:grid-cols-[180px_repeat(3,minmax(0,1fr))]"
                                    >
                                        <div className="flex items-center">
                                            <span className="text-sm font-semibold text-gray-700">{row.title}</span>
                                        </div>

                                        {row.fields.map((field) => (
                                            <div key={field.key}>
                                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 md:hidden">
                                                    {field.label}
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={formData[field.key] || field.fallback}
                                                        onChange={(e) =>
                                                            setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                                        }
                                                        className="h-10 w-14 rounded border border-gray-300 p-1"
                                                    />
                                                    <Input
                                                        value={formData[field.key]}
                                                        onChange={(e) =>
                                                            setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                                        }
                                                        placeholder={field.placeholder}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Business Details</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Facebook Page Link</label>
                                <Input
                                    value={formData.fb_link}
                                    onChange={(e) => setFormData({ ...formData, fb_link: e.target.value })}
                                    placeholder="https://www.facebook.com/yourpage"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Hotline Number</label>
                                <Input
                                    value={formData.hotline}
                                    onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                                    placeholder="017xxxxxxxx"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp Number</label>
                                <Input
                                    value={formData.whatsapp}
                                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                    placeholder="017xxxxxxxx"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Messenger Link</label>
                                <Input
                                    value={formData.messenger}
                                    onChange={(e) => setFormData({ ...formData, messenger: e.target.value })}
                                    placeholder="https://m.me/your-page"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Footer Payment Image</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                    value={Number(formData.footer_payment_enabled ?? 1)}
                                    onChange={(e) => setFormData({ ...formData, footer_payment_enabled: Number(e.target.value) })}
                                >
                                    <option value={1}>Active</option>
                                    <option value={0}>Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Show Stock</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                    value={Number(formData.is_stock_visible ?? 1)}
                                    onChange={(e) => setFormData({ ...formData, is_stock_visible: Number(e.target.value) })}
                                >
                                    <option value={1}>Visible</option>
                                    <option value={0}>Hidden</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Brand Assets</h4>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                                <label className="mb-2 block text-sm font-medium text-gray-700">Logo</label>
                                <Upload
                                    listType="picture-card"
                                    accept="image/*"
                                    maxCount={1}
                                    fileList={uploadFileLists.logo}
                                    beforeUpload={createBeforeUpload('logo', 'Logo')}
                                    onChange={({ fileList }) => handleUploadChange('logo', fileList)}
                                    onRemove={() => {
                                        handleUploadChange('logo', []);
                                        return true;
                                    }}
                                >
                                    {uploadFileLists.logo.length >= 1 ? null : (
                                        <div className="flex flex-col items-center text-gray-500">
                                            <FiUploadCloud className="text-xl" />
                                            <span className="mt-1 text-xs font-medium">Upload Logo</span>
                                        </div>
                                    )}
                                </Upload>
                                <p className="text-xs text-gray-500">
                                    Label: 200 x 60 px (recommended) | Max size: {MAX_IMAGE_SIZE_LABEL} | No width/height restriction.
                                </p>
                                {fileErrors.logo ? <p className="mt-1 text-xs text-red-600">{fileErrors.logo}</p> : null}
                            </div>

                            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                                <label className="mb-2 block text-sm font-medium text-gray-700">Favicon</label>
                                <Upload
                                    listType="picture-card"
                                    accept="image/*"
                                    maxCount={1}
                                    fileList={uploadFileLists.favicon}
                                    beforeUpload={createBeforeUpload('favicon', 'Favicon')}
                                    onChange={({ fileList }) => handleUploadChange('favicon', fileList)}
                                    onRemove={() => {
                                        handleUploadChange('favicon', []);
                                        return true;
                                    }}
                                >
                                    {uploadFileLists.favicon.length >= 1 ? null : (
                                        <div className="flex flex-col items-center text-gray-500">
                                            <FiUploadCloud className="text-xl" />
                                            <span className="mt-1 text-xs font-medium">Upload Favicon</span>
                                        </div>
                                    )}
                                </Upload>
                                <p className="text-xs text-gray-500">
                                    Label: 64 x 64 px (recommended) | Max size: {MAX_IMAGE_SIZE_LABEL} | No width/height restriction.
                                </p>
                                {fileErrors.favicon ? <p className="mt-1 text-xs text-red-600">{fileErrors.favicon}</p> : null}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
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

export default GeneralSettings;
