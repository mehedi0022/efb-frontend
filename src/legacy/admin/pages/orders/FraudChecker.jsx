import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    FiCheckCircle,
    FiClock,
    FiPhone,
    FiSearch,
    FiTruck,
    FiXCircle,
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { showErrorMessage } from '../../utils/alerts';
import { useAdminActionMutation } from '../../../store/adminApi';

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toPercent = (value) => `${toNumber(value).toFixed(2)}%`;

const SummaryCard = ({ title, value, icon: Icon, bgClass = 'bg-gray-50', iconClass = 'text-gray-700' }) => (
    <div className={`rounded-xl border border-gray-200 p-4 ${bgClass}`}>
        <div className="flex items-center justify-between gap-3">
            <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
            </div>
            <div className={`rounded-full bg-white p-2 ${iconClass}`}>
                <Icon className="h-5 w-5" />
            </div>
        </div>
    </div>
);

const FraudChecker = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [phone, setPhone] = useState(() => searchParams.get('phone') || '');
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [adminAction] = useAdminActionMutation();
    const autoCheckedPhoneRef = useRef('');

    const runFraudCheck = async (phoneValue) => {
        const nextPhone = String(phoneValue || '').trim();
        if (!nextPhone) {
            showErrorMessage('Please enter a phone number.');
            return;
        }

        autoCheckedPhoneRef.current = nextPhone;
        setSubmitting(true);

        try {
            const response = await adminAction({
                url: '/admin/fraud-checker/check',
                method: 'POST',
                body: { phone: nextPhone },
                notifySuccess: false,
            }).unwrap();

            setResult(response?.data || null);
            setSearchParams({ phone: nextPhone }, { replace: true });
        } catch (error) {
            const message = error?.data?.message || 'Failed to retrieve fraud checker data.';
            showErrorMessage(message);
            setResult(null);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const queryPhone = String(searchParams.get('phone') || '').trim();
        if (!queryPhone) return;
        if (autoCheckedPhoneRef.current === queryPhone) return;

        autoCheckedPhoneRef.current = queryPhone;
        setPhone(queryPhone);
        runFraudCheck(queryPhone);
    }, [searchParams]);

    const courierData = useMemo(() => {
        const value = result?.courierData;
        return value && typeof value === 'object' ? value : {};
    }, [result]);

    const summary = useMemo(() => {
        const source = result?.summary || courierData.summary || {};
        const total = toNumber(source.total_parcel);
        const success = toNumber(source.success_parcel);
        const cancelled = toNumber(source.cancelled_parcel);
        const pendingRaw = source.pending_parcel ?? source.pending;
        const pending = Math.max(0, toNumber(pendingRaw || total - (success + cancelled)));

        return {
            total,
            success,
            cancelled,
            pending,
            successRatio: toPercent(source.success_ratio),
            returnRatio: toPercent(source.return_ratio),
        };
    }, [result, courierData]);

    const couriers = useMemo(() => {
        return Object.entries(courierData)
            .filter(([key, value]) => key !== 'summary' && value && typeof value === 'object')
            .map(([key, value]) => {
                const total = toNumber(value.total_parcel);
                const success = toNumber(value.success_parcel);
                const cancelled = toNumber(value.cancelled_parcel);
                const pending = Math.max(0, toNumber(value.pending_parcel || total - (success + cancelled)));

                return {
                    key,
                    name: value.name || key,
                    logo: value.logo || null,
                    total,
                    success,
                    cancelled,
                    pending,
                    successRatio: toPercent(value.success_ratio),
                    returnRatio: toPercent(value.return_ratio),
                };
            });
    }, [courierData]);

    const checkedAt = result?.checked_at || '';

    return (
        <div className="container-fluid space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <FiCheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Fraud Checker</h2>
                        <p className="text-sm text-gray-500">Check courier fraud history by customer phone number</p>
                    </div>
                </div>
                {checkedAt && (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                        Last checked: {checkedAt}
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-admin-gray-200 bg-white p-5 shadow-card">
                <form
                    className="grid gap-3 md:grid-cols-[1fr_auto]"
                    onSubmit={(event) => {
                        event.preventDefault();
                        runFraudCheck(phone);
                    }}
                >
                    <Input
                        label="Phone Number"
                        type="text"
                        placeholder="e.g. 017XXXXXXXX"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={submitting}
                    />
                    <div className="flex items-end">
                        <Button
                            type="submit"
                            variant="primary"
                            rounded="md"
                            className="w-full md:w-auto"
                            loading={submitting}
                            icon={FiSearch}
                        >
                            {submitting ? 'Checking...' : 'Check Fraud'}
                        </Button>
                    </div>
                </form>
            </div>

            {result && (
                <>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                            <FiCheckCircle className="h-4 w-4" />
                            Fraud check completed successfully.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard title="Total Parcel" value={summary.total} icon={FiTruck} bgClass="bg-cyan-50" iconClass="text-cyan-700" />
                        <SummaryCard title="Success Parcel" value={summary.success} icon={FiCheckCircle} bgClass="bg-emerald-50" iconClass="text-emerald-700" />
                        <SummaryCard title="Cancelled Parcel" value={summary.cancelled} icon={FiXCircle} bgClass="bg-red-50" iconClass="text-red-700" />
                        <SummaryCard title="Pending Parcel" value={summary.pending} icon={FiClock} bgClass="bg-amber-50" iconClass="text-amber-700" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Checked Phone</p>
                            <p className="mt-1 text-lg font-semibold text-gray-900">{result?.phone || '-'}</p>
                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                                <FiPhone className="h-4 w-4" />
                                Fraud analysis summary
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Success Ratio</p>
                            <p className="mt-1 text-lg font-semibold text-emerald-700">{summary.successRatio}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Return Ratio</p>
                            <p className="mt-1 text-lg font-semibold text-red-700">{summary.returnRatio}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">Courier Breakdown</h3>
                            <span className="text-xs text-gray-500">{couriers.length} courier(s)</span>
                        </div>

                        {couriers.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                                No courier specific data found for this phone.
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {couriers.map((courier) => (
                                    <div key={courier.key} className="rounded-xl border border-gray-200 p-4">
                                        <div className="mb-4 flex items-center gap-3">
                                            {courier.logo ? (
                                                <img
                                                    src={courier.logo}
                                                    alt={courier.name}
                                                    className="h-10 w-24 rounded border border-gray-100 object-contain p-1"
                                                    onError={(event) => {
                                                        event.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                                                    <FiTruck className="h-5 w-5" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{courier.name}</p>
                                                <p className="text-xs text-gray-500">Courier source</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600">Total</span>
                                                <span className="font-semibold text-gray-900">{courier.total}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600">Success</span>
                                                <span className="font-semibold text-emerald-700">{courier.success}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600">Cancelled</span>
                                                <span className="font-semibold text-red-700">{courier.cancelled}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600">Pending</span>
                                                <span className="font-semibold text-amber-700">{courier.pending}</span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                                                <span className="text-gray-600">Success Ratio</span>
                                                <span className="font-semibold text-emerald-700">{courier.successRatio}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600">Return Ratio</span>
                                                <span className="font-semibold text-red-700">{courier.returnRatio}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default FraudChecker;
