import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const CourierApiSettings = () => {
    const [steadfast, setSteadfast] = useState(null);
    const [pathao, setPathao] = useState(null);
    const [tokenForm, setTokenForm] = useState({
        client_id: '',
        client_secret: '',
        username: '',
        password: '',
    });
    const [generatedToken, setGeneratedToken] = useState('');
    const [loading, setLoading] = useState(false);
    const tagKey = 'courier';
    const { data: response } = useAdminFetchQuery({ url: '/admin/integrations/courier', tags: [tagKey] });
    const [adminAction] = useAdminActionMutation();

    useEffect(() => {
        if (response?.success) {
            setSteadfast(response.steadfast || {});
            setPathao(response.pathao || {});
        }
    }, [response]);

    const updateCourier = async (courier) => {
        if (!courier?.id) return;
        setLoading(true);
        try {
            await adminAction({
                url: `/admin/integrations/courier/${courier.id}`,
                method: 'PUT',
                body: courier,
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error updating courier:', error);
            alert(error?.data?.message || 'Failed to update');
        } finally {
            setLoading(false);
        }
    };

    const handleTokenRequest = async (e) => {
        e.preventDefault();
        try {
            const result = await adminAction({
                url: '/admin/integrations/pathao-token',
                method: 'POST',
                body: tokenForm,
            }).unwrap();
            if (result?.success) {
                setGeneratedToken(result.token || '');
            } else {
                alert('Failed to retrieve token');
            }
        } catch (error) {
            console.error('Error fetching Pathao token:', error);
            alert(error?.data?.message || 'Failed to retrieve token');
        }
    };

    return (
        <div className="container-fluid space-y-6">
            <div className="bg-white rounded-lg shadow-card p-6">
                <h2 className="text-xl font-semibold mb-4">Steadfast Courier</h2>
                {steadfast && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            updateCourier(steadfast);
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <Input label="API Key" value={steadfast.api_key || ''} onChange={(e) => setSteadfast({ ...steadfast, api_key: e.target.value })} required />
                        <Input label="Secret Key" value={steadfast.secret_key || ''} onChange={(e) => setSteadfast({ ...steadfast, secret_key: e.target.value })} required />
                        <Input label="URL" value={steadfast.url || ''} onChange={(e) => setSteadfast({ ...steadfast, url: e.target.value })} required />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={steadfast.status ?? 0}
                                onChange={(e) => setSteadfast({ ...steadfast, status: Number(e.target.value) })}
                            >
                                <option value={1}>Active</option>
                                <option value={0}>Inactive</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" variant="primary" disabled={loading}>Save</Button>
                        </div>
                    </form>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-card p-6">
                <h2 className="text-xl font-semibold mb-4">Pathao Courier</h2>
                {pathao && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            updateCourier(pathao);
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <Input label="URL" value={pathao.url || ''} onChange={(e) => setPathao({ ...pathao, url: e.target.value })} required />
                        <Input label="Token" value={pathao.token || ''} onChange={(e) => setPathao({ ...pathao, token: e.target.value })} required />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={pathao.status ?? 0}
                                onChange={(e) => setPathao({ ...pathao, status: Number(e.target.value) })}
                            >
                                <option value={1}>Active</option>
                                <option value={0}>Inactive</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" variant="primary" disabled={loading}>Save</Button>
                        </div>
                    </form>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-card p-6">
                <h2 className="text-xl font-semibold mb-4">Generate Pathao Token</h2>
                <form onSubmit={handleTokenRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Client ID" value={tokenForm.client_id} onChange={(e) => setTokenForm({ ...tokenForm, client_id: e.target.value })} required />
                    <Input label="Client Secret" value={tokenForm.client_secret} onChange={(e) => setTokenForm({ ...tokenForm, client_secret: e.target.value })} required />
                    <Input label="Username" value={tokenForm.username} onChange={(e) => setTokenForm({ ...tokenForm, username: e.target.value })} required />
                    <Input label="Password" type="password" value={tokenForm.password} onChange={(e) => setTokenForm({ ...tokenForm, password: e.target.value })} required />
                    <div className="md:col-span-2 flex justify-end">
                        <Button type="submit" variant="primary">Generate</Button>
                    </div>
                </form>
                {generatedToken && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Generated Token</label>
                        <Input value={generatedToken} readOnly />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourierApiSettings;
