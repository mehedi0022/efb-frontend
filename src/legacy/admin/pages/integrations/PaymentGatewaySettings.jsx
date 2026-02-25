import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const PaymentGatewaySettings = () => {
    const [bkash, setBkash] = useState(null);
    const [shurjopay, setShurjopay] = useState(null);
    const [loading, setLoading] = useState(false);
    const tagKey = 'payment-gateway';
    const { data: response } = useAdminFetchQuery({ url: '/admin/integrations/payment', tags: [tagKey] });
    const [adminAction] = useAdminActionMutation();

    useEffect(() => {
        if (response?.success) {
            setBkash(response.bkash || {});
            setShurjopay(response.shurjopay || {});
        }
    }, [response]);

    const updateGateway = async (gateway, data) => {
        if (!gateway?.id) return;
        setLoading(true);
        try {
            await adminAction({
                url: `/admin/integrations/payment/${gateway.id}`,
                method: 'PUT',
                body: data,
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error updating gateway:', error);
            alert(error?.data?.message || 'Failed to update');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid space-y-6">
            <div className="bg-white rounded-lg shadow-card p-6">
                <h2 className="text-xl font-semibold mb-4">Bkash</h2>
                {bkash && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            updateGateway(bkash, bkash);
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <Input label="User Name" value={bkash.username || ''} onChange={(e) => setBkash({ ...bkash, username: e.target.value })} required />
                        <Input label="App Key" value={bkash.app_key || ''} onChange={(e) => setBkash({ ...bkash, app_key: e.target.value })} required />
                        <Input label="App Secret" value={bkash.app_secret || ''} onChange={(e) => setBkash({ ...bkash, app_secret: e.target.value })} required />
                        <Input label="Base URL" value={bkash.base_url || ''} onChange={(e) => setBkash({ ...bkash, base_url: e.target.value })} required />
                        <Input label="Password" value={bkash.password || ''} onChange={(e) => setBkash({ ...bkash, password: e.target.value })} required />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={bkash.status ?? 0}
                                onChange={(e) => setBkash({ ...bkash, status: Number(e.target.value) })}
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
                <h2 className="text-xl font-semibold mb-4">Shurjopay</h2>
                {shurjopay && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            updateGateway(shurjopay, shurjopay);
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <Input label="User Name" value={shurjopay.username || ''} onChange={(e) => setShurjopay({ ...shurjopay, username: e.target.value })} required />
                        <Input label="Prefix" value={shurjopay.prefix || ''} onChange={(e) => setShurjopay({ ...shurjopay, prefix: e.target.value })} required />
                        <Input label="Success URL" value={shurjopay.success_url || ''} onChange={(e) => setShurjopay({ ...shurjopay, success_url: e.target.value })} required />
                        <Input label="Return URL" value={shurjopay.return_url || ''} onChange={(e) => setShurjopay({ ...shurjopay, return_url: e.target.value })} required />
                        <Input label="Base URL" value={shurjopay.base_url || ''} onChange={(e) => setShurjopay({ ...shurjopay, base_url: e.target.value })} required />
                        <Input label="Password" value={shurjopay.password || ''} onChange={(e) => setShurjopay({ ...shurjopay, password: e.target.value })} required />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={shurjopay.status ?? 0}
                                onChange={(e) => setShurjopay({ ...shurjopay, status: Number(e.target.value) })}
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
        </div>
    );
};

export default PaymentGatewaySettings;
