import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const SmsGatewaySettings = () => {
    const [sms, setSms] = useState(null);
    const [loading, setLoading] = useState(false);
    const tagKey = 'sms-gateway';
    const { data: response } = useAdminFetchQuery({ url: '/admin/integrations/sms', tags: [tagKey] });
    const [adminAction] = useAdminActionMutation();

    useEffect(() => {
        if (response?.data) {
            setSms(response.data || {});
        }
    }, [response]);

    const updateGateway = async (e) => {
        e.preventDefault();
        if (!sms?.id) return;
        setLoading(true);
        try {
            await adminAction({
                url: `/admin/integrations/sms/${sms.id}`,
                method: 'PUT',
                body: sms,
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error updating SMS gateway:', error);
            alert(error?.data?.message || 'Failed to update');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid">
            <div className="bg-white rounded-lg shadow-card p-6">
                <h2 className="text-xl font-semibold mb-4">SMS Gateway</h2>
                {sms && (
                    <form onSubmit={updateGateway} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="URL" value={sms.url || ''} onChange={(e) => setSms({ ...sms, url: e.target.value })} required />
                        <Input label="API Key" value={sms.api_key || ''} onChange={(e) => setSms({ ...sms, api_key: e.target.value })} required />
                        <Input label="Sender ID" value={sms.serderid || ''} onChange={(e) => setSms({ ...sms, serderid: e.target.value })} required />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={sms.status ?? 0}
                                onChange={(e) => setSms({ ...sms, status: Number(e.target.value) })}
                            >
                                <option value={1}>Active</option>
                                <option value={0}>Inactive</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Confirm</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={sms.order ?? 0}
                                onChange={(e) => setSms({ ...sms, order: Number(e.target.value) })}
                            >
                                <option value={1}>Enabled</option>
                                <option value={0}>Disabled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Forgot Password</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={sms.forget_pass ?? 0}
                                onChange={(e) => setSms({ ...sms, forget_pass: Number(e.target.value) })}
                            >
                                <option value={1}>Enabled</option>
                                <option value={0}>Disabled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password Generator</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={sms.password_g ?? 0}
                                onChange={(e) => setSms({ ...sms, password_g: Number(e.target.value) })}
                            >
                                <option value={1}>Enabled</option>
                                <option value={0}>Disabled</option>
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

export default SmsGatewaySettings;
