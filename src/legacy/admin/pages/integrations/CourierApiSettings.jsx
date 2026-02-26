import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';
import { showErrorMessage, showSuccessAlert } from '../../utils/alerts';

const emptyCourier = (type) => ({
    id: null,
    type,
    url: '',
    status: 0,
    api_key: '',
    secret_key: '',
    client_id: '',
    client_secret: '',
    username: '',
    password: '',
    token: '',
    token_expires_at: '',
    has_api_key: false,
    has_secret_key: false,
    has_client_secret: false,
    has_password: false,
});

const CourierApiSettings = () => {
    const tagKey = 'courier';
    const { data: response } = useAdminFetchQuery({
        url: '/admin/integrations/courier',
        tags: [tagKey, 'settings'],
    });
    const [adminAction] = useAdminActionMutation();
    const [saving, setSaving] = useState(false);
    const [activeCourier, setActiveCourier] = useState('pathao');
    const [couriers, setCouriers] = useState({
        pathao: emptyCourier('pathao'),
        steadfast: emptyCourier('steadfast'),
    });

    useEffect(() => {
        if (!response?.success) return;

        const pathaoConfig = response?.pathao || response?.couriers?.pathao || emptyCourier('pathao');
        const steadfastConfig = response?.steadfast || response?.couriers?.steadfast || emptyCourier('steadfast');

        setCouriers({
            pathao: { ...emptyCourier('pathao'), ...pathaoConfig, type: 'pathao' },
            steadfast: { ...emptyCourier('steadfast'), ...steadfastConfig, type: 'steadfast' },
        });
        setActiveCourier(response.active_courier || 'pathao');
    }, [response]);

    const selectedCourier = couriers[activeCourier] || emptyCourier(activeCourier);
    const isPathao = activeCourier === 'pathao';

    const tokenInfo = useMemo(() => {
        if (!selectedCourier?.token) return 'No token generated yet.';
        if (!selectedCourier?.token_expires_at) return 'Token generated.';
        return `Expires at: ${selectedCourier.token_expires_at}`;
    }, [selectedCourier?.token, selectedCourier?.token_expires_at]);

    const updateCourierField = (field, value) => {
        setCouriers((prev) => ({
            ...prev,
            [activeCourier]: {
                ...prev[activeCourier],
                [field]: value,
            },
        }));
    };

    const persistCourierConfig = async ({ forceTokenRefresh = false } = {}) => {
        if (!selectedCourier?.id) {
            showErrorMessage('Courier configuration is not ready yet. Refresh and try again.');
            return;
        }

        setSaving(true);
        try {
            const result = await adminAction({
                url: `/admin/integrations/courier/${selectedCourier.id}`,
                method: 'PUT',
                body: {
                    active_courier: activeCourier,
                    status: Number(selectedCourier.status) === 1,
                    url: selectedCourier.url || '',
                    api_key: selectedCourier.api_key || '',
                    secret_key: selectedCourier.secret_key || '',
                    client_id: selectedCourier.client_id || '',
                    client_secret: selectedCourier.client_secret || '',
                    username: selectedCourier.username || '',
                    password: selectedCourier.password || '',
                    refresh_token: forceTokenRefresh || isPathao,
                },
                invalidates: [tagKey, 'settings'],
                notifySuccess: false,
            }).unwrap();

            const nextActive = result?.active_courier || activeCourier;
            const nextCourierData = result?.data || {};

            setActiveCourier(nextActive);
            setCouriers((prev) => ({
                ...prev,
                [activeCourier]: {
                    ...prev[activeCourier],
                    ...nextCourierData,
                    api_key: '',
                    secret_key: '',
                    client_secret: '',
                    password: '',
                },
            }));

            showSuccessAlert({
                title: 'Saved',
                content: result?.message || 'Courier configuration saved successfully.',
            });
        } catch (error) {
            showErrorMessage(error?.data?.message || 'Failed to save courier configuration.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container-fluid space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-card">
                <h2 className="mb-4 text-xl font-semibold">Courier API Settings</h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Courier Selection</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={activeCourier}
                            onChange={(e) => setActiveCourier(e.target.value)}
                        >
                            <option value="pathao">Pathao</option>
                            <option value="steadfast">Steadfast</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                        <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={Number(selectedCourier.status) === 1 ? 1 : 0}
                            onChange={(e) => updateCourierField('status', Number(e.target.value))}
                        >
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold capitalize">{activeCourier} Credentials</h3>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Stored securely
                    </span>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        persistCourierConfig();
                    }}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                    <Input
                        label="API URL / Endpoint"
                        value={selectedCourier.url || ''}
                        onChange={(e) => updateCourierField('url', e.target.value)}
                        placeholder={isPathao ? 'https://api-hermes.pathao.com' : 'https://your-steadfast-endpoint.com'}
                    />

                    <Input
                        label="Client ID"
                        value={selectedCourier.client_id || ''}
                        onChange={(e) => updateCourierField('client_id', e.target.value)}
                        placeholder="Enter client ID"
                    />

                    <Input
                        label={`Client Secret ${selectedCourier.has_client_secret ? '(Already saved)' : ''}`}
                        type="password"
                        value={selectedCourier.client_secret || ''}
                        onChange={(e) => updateCourierField('client_secret', e.target.value)}
                        placeholder={selectedCourier.has_client_secret ? '********' : 'Enter client secret'}
                    />

                    <Input
                        label="Username"
                        value={selectedCourier.username || ''}
                        onChange={(e) => updateCourierField('username', e.target.value)}
                        placeholder="Enter username"
                    />

                    <Input
                        label={`Password ${selectedCourier.has_password ? '(Already saved)' : ''}`}
                        type="password"
                        value={selectedCourier.password || ''}
                        onChange={(e) => updateCourierField('password', e.target.value)}
                        placeholder={selectedCourier.has_password ? '********' : 'Enter password'}
                    />

                    <Input
                        label={`API Key ${selectedCourier.has_api_key ? '(Already saved)' : ''}`}
                        type="password"
                        value={selectedCourier.api_key || ''}
                        onChange={(e) => updateCourierField('api_key', e.target.value)}
                        placeholder={selectedCourier.has_api_key ? '********' : 'Optional API key'}
                    />

                    <Input
                        label={`Secret Key ${selectedCourier.has_secret_key ? '(Already saved)' : ''}`}
                        type="password"
                        value={selectedCourier.secret_key || ''}
                        onChange={(e) => updateCourierField('secret_key', e.target.value)}
                        placeholder={selectedCourier.has_secret_key ? '********' : 'Optional secret key'}
                    />

                    <Input
                        label="Generated Token"
                        value={selectedCourier.token || ''}
                        readOnly
                    />

                    <div className="md:col-span-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        {tokenInfo}
                    </div>

                    <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                        {isPathao ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => persistCourierConfig({ forceTokenRefresh: true })}
                                disabled={saving}
                            >
                                Refresh Token
                            </Button>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CourierApiSettings;

