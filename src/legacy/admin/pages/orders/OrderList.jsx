import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiShoppingCart, FiEye, FiEdit, FiUpload, FiSave, FiPlus } from 'react-icons/fi';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { formatCurrency, formatDate, formatDateTime, timeAgo, getStatusColor } from '../../utils/helpers';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';
import { showConfirmAlert, showErrorMessage, showSuccessAlert } from '../../utils/alerts';

const { RangePicker } = DatePicker;

const OrderList = () => {
    const { status = 'all' } = useParams();
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [filters, setFilters] = useState({
        keyword: '',
        start_date: '',
        end_date: '',
    });
    const [appliedFilters, setAppliedFilters] = useState({
        keyword: '',
        start_date: '',
        end_date: '',
    });
    const [updatingStatusOrderIds, setUpdatingStatusOrderIds] = useState([]);
    const [statusDraftByOrderId, setStatusDraftByOrderId] = useState({});
    const [sendingEfbOrderIds, setSendingEfbOrderIds] = useState([]);
    const [efbSentOrderIds, setEfbSentOrderIds] = useState([]);

    const tagKey = `orders:${status}`;
    const queryArgs = useMemo(() => ({
        url: `/admin/orders/${status}`,
        params: {
            page: pagination.current_page,
            ...appliedFilters,
        },
        tags: [tagKey, 'orders'],
    }), [status, pagination.current_page, appliedFilters, tagKey]);

    const { data: response, isLoading, isFetching, error } = useAdminFetchQuery(queryArgs);
    const { data: statusResponse } = useAdminFetchQuery({
        url: '/admin/order-statuses',
        tags: ['order-statuses'],
    });
    const [adminAction] = useAdminActionMutation();
    const statusOptions = (statusResponse?.data || []).filter(
        (statusItem) => Number(statusItem.status) === 1
    );

    const statusLabel = status === 'all'
        ? 'All'
        : status.charAt(0).toUpperCase() + status.slice(1);

    const resolveImageUrl = (image) => {
        if (!image) return null;
        if (image.startsWith('http://') || image.startsWith('https://')) return image;
        const normalized = image.replace(/^\/+/, '');
        if (normalized === 'default.png') return null;
        return `/${normalized}`;
    };

    const orders = response?.data || [];
    const loading = (isLoading && !response) || isFetching;

    useEffect(() => {
        setStatusDraftByOrderId((prev) => {
            const next = {};
            orders.forEach((order) => {
                const orderId = Number(order.id);
                const currentStatusId = Number(order.order_status);
                next[orderId] = Number.isFinite(currentStatusId) && currentStatusId > 0
                    ? currentStatusId
                    : '';
            });

            const prevKeys = Object.keys(prev);
            const nextKeys = Object.keys(next);
            if (
                prevKeys.length === nextKeys.length &&
                prevKeys.every((key) => prev[key] === next[key])
            ) {
                return prev;
            }
            return next;
        });
    }, [orders]);

    useEffect(() => {
        if (!response?.pagination) return;
        const next = response.pagination;
        setPagination((prev) => {
            if (
                prev.current_page === next.current_page &&
                prev.last_page === next.last_page &&
                prev.total === next.total
            ) {
                return prev;
            }
            return { ...prev, ...next };
        });
    }, [response]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, current_page: 1 }));
    }, [status]);

    const handleSendToEfb = async (order) => {
        const orderId = Number(order.id);
        if (!Number.isFinite(orderId) || orderId <= 0) return;
        if (Number(order.is_complete_order) === 1 || efbSentOrderIds.includes(orderId)) return;

        const confirmed = await showConfirmAlert({
            title: 'Are you sure?',
            content: 'You want to send this order to EFB.',
            okText: 'Yes, Send',
            cancelText: 'Cancel',
        });

        if (!confirmed) return;

        setSendingEfbOrderIds((prev) => [...new Set([...prev, orderId])]);

        try {
            const result = await adminAction({
                url: '/admin/orders/send-dropshipping',
                method: 'POST',
                body: { order_id: orderId },
                invalidates: [tagKey, 'orders'],
                notifySuccess: false,
            }).unwrap();

            setEfbSentOrderIds((prev) => [...new Set([...prev, orderId])]);
            showSuccessAlert({
                title: 'Success',
                content: result?.message || 'Order sent to dropshipping successfully.',
            });
        } catch (submitError) {
            showErrorMessage(submitError?.data?.message || 'Failed to send order to EFB.');
        } finally {
            setSendingEfbOrderIds((prev) => prev.filter((id) => id !== orderId));
        }
    };

    const handleStatusSelectionChange = (orderId, statusId) => {
        const nextStatusId = Number(statusId);
        setStatusDraftByOrderId((prev) => ({
            ...prev,
            [orderId]: Number.isFinite(nextStatusId) && nextStatusId > 0 ? nextStatusId : '',
        }));
    };

    const handleQuickStatusUpdate = async (order) => {
        const orderId = Number(order.id);
        const selectedStatusId = Number(statusDraftByOrderId[orderId] || 0);
        const currentStatusId = Number(order.order_status || 0);
        const nextStatusId = selectedStatusId || currentStatusId;

        if (!Number.isFinite(nextStatusId) || nextStatusId <= 0) return;
        if (nextStatusId === currentStatusId) return;

        const selectedStatus = statusOptions.find(
            (statusItem) => Number(statusItem.id) === nextStatusId
        );
        const confirmed = await showConfirmAlert({
            title: 'Update Order Status?',
            content: `Invoice #${order.invoice_id} status will be changed to "${selectedStatus?.name || 'Selected'}".`,
            okText: 'Yes, Update',
            cancelText: 'Cancel',
        });

        if (!confirmed) return;

        setUpdatingStatusOrderIds((prev) => [...new Set([...prev, orderId])]);

        try {
            const result = await adminAction({
                url: '/admin/orders/update-status',
                method: 'POST',
                body: {
                    order_ids: [orderId],
                    status: nextStatusId,
                },
                invalidates: [tagKey, 'orders'],
                notifySuccess: false,
            }).unwrap();

            showSuccessAlert({
                title: 'Status Updated',
                content:
                    result?.message ||
                    `Order #${order.invoice_id} status updated to "${selectedStatus?.name || 'Selected'}".`,
            });
        } catch (submitError) {
            showErrorMessage(submitError?.data?.message || 'Failed to update order status.');
        } finally {
            setUpdatingStatusOrderIds((prev) => prev.filter((id) => id !== orderId));
        }
    };

    const handleFilterSubmit = () => {
        setPagination((prev) => ({ ...prev, current_page: 1 }));
        setAppliedFilters(filters);
    };

    const handleFilterReset = () => {
        const reset = { keyword: '', start_date: '', end_date: '' };
        setFilters(reset);
        setAppliedFilters(reset);
        setPagination((prev) => ({ ...prev, current_page: 1 }));
    };

    const handlePageChange = (page) => {
        setPagination((prev) => ({ ...prev, current_page: page }));
    };

    const filterRangeValue = useMemo(() => {
        const start = filters.start_date ? dayjs(filters.start_date, 'YYYY-MM-DD') : null;
        const end = filters.end_date ? dayjs(filters.end_date, 'YYYY-MM-DD') : null;

        if (!start && !end) return null;
        return [start, end];
    }, [filters.start_date, filters.end_date]);

    const filterRangePresets = useMemo(() => ([
        {
            label: 'Last 7 Days',
            value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')],
        },
        {
            label: 'Last 30 Days',
            value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')],
        },
        {
            label: 'Last 90 Days',
            value: [dayjs().subtract(89, 'day').startOf('day'), dayjs().endOf('day')],
        },
    ]), []);

    const columns = [
        {
            header: 'SL',
            accessor: 'id',
            width: '4%',
            render: (row, index) => index + 1,
        },
        {
            header: 'Image',
            accessor: 'image',
            width: '8%',
            render: (row) => (
                <img
                    src={resolveImageUrl(row.image) || 'https://via.placeholder.com/50'}
                    alt="Order"
                    className="h-12 w-12 rounded-lg object-cover ring-1 ring-admin-gray-200"
                />
            ),
        },
        {
            header: 'Invoice',
            accessor: 'invoice_id',
            width: '9%',
        },
        {
            header: 'Fraud Check',
            accessor: 'fraud_check',
            width: '11%',
            render: (row) => (
                <Link
                    to={`/fraud-checker${row?.shipping?.phone || row?.customer?.phone
                        ? `?phone=${encodeURIComponent(row?.shipping?.phone || row?.customer?.phone || '')}`
                        : ''
                    }`}
                >
                    <Button size="sm" variant="warning" className="whitespace-nowrap">
                        Fraud Check
                    </Button>
                </Link>
            ),
        },
        {
            header: 'Date',
            accessor: 'updated_at',
            width: '15%',
            render: (row) => (
                <div className="text-xs">
                    <div>{formatDate(row.updated_at)}</div>
                    <div>{formatDateTime(row.updated_at).split(' ')[1]}</div>
                    <div className="text-gray-500">{timeAgo(row.updated_at)}</div>
                </div>
            ),
        },
        {
            header: 'Customer',
            accessor: 'customer',
            width: '18%',
            render: (row) => (
                <div className="text-xs">
                    {row.shipping?.name}, {row.shipping?.address}, {row.shipping?.phone}
                </div>
            ),
        },
        {
            header: 'IP Address',
            accessor: 'ip_address',
            width: '12%',
            render: (row) => (
                <span className="font-mono text-xs">
                    {row.ip_address || row.shipping?.ip_address || '-'}
                </span>
            ),
        },
        {
            header: 'Assign',
            accessor: 'user',
            width: '8%',
            render: (row) => row.user?.name || 'Not Assign',
        },
        {
            header: 'Amount',
            accessor: 'amount',
            width: '8%',
            render: (row) => formatCurrency(row.amount),
        },
        {
            header: 'Status',
            accessor: 'status',
            width: '14%',
            render: (row) => {
                const orderId = Number(row.id);
                const isUpdating = updatingStatusOrderIds.includes(orderId);
                const currentStatusId = Number(row.order_status || 0);
                const draftStatusId = Number(statusDraftByOrderId[orderId] || currentStatusId || 0);
                const hasStatusChanged =
                    Number.isFinite(draftStatusId) &&
                    draftStatusId > 0 &&
                    draftStatusId !== currentStatusId;

                return (
                    <div className="space-y-1">
                        <Badge color={getStatusColor(row.status?.name)}>
                            {row.status?.name || row.status_name || 'Unknown'}
                        </Badge>
                        <select
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                            value={statusDraftByOrderId[orderId] ?? (Number(row.order_status) || '')}
                            disabled={isUpdating}
                            onChange={(e) => handleStatusSelectionChange(orderId, e.target.value)}
                        >
                            <option value="">Select status</option>
                            {statusOptions.map((statusItem) => (
                                <option key={statusItem.id} value={statusItem.id}>
                                    {statusItem.name}
                                </option>
                            ))}
                        </select>
                        <Button
                            size="sm"
                            variant="primary"
                            className="w-full"
                            disabled={isUpdating || !hasStatusChanged}
                            onClick={() => handleQuickStatusUpdate(row)}
                        >
                            <FiSave className="h-4 w-4" />
                            {isUpdating ? 'Updating...' : 'Update Status'}
                        </Button>
                    </div>
                );
            },
        },
        {
            header: 'Action',
            accessor: 'actions',
            width: '16%',
            render: (row) => {
                const orderId = Number(row.id);
                const isSendingEfb = sendingEfbOrderIds.includes(orderId);
                const isEfbSent =
                    Number(row.is_complete_order) === 1 ||
                    efbSentOrderIds.includes(orderId);

                return (
                    <div className="flex items-center gap-2">
                        <Link to={`/orders/invoice/${row.invoice_id}`} title="View">
                            <FiEye className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                        </Link>
                        <Link to={`/orders/edit/${row.invoice_id}`} title="Edit">
                            <FiEdit className="h-4 w-4 text-yellow-600 hover:text-yellow-800" />
                        </Link>
                        <Button
                            size="sm"
                            variant={isEfbSent ? 'success' : 'accent'}
                            disabled={isEfbSent || isSendingEfb}
                            className="whitespace-nowrap"
                            onClick={() => handleSendToEfb(row)}
                        >
                            <FiUpload className="h-4 w-4" />
                            {isEfbSent ? 'Sent ✓' : (isSendingEfb ? 'Sending...' : 'Send FB')}
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="container-fluid">
            <div className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-admin-primary/10 text-admin-primary">
                            <FiShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-admin-gray-500">Orders</p>
                            <h4 className="text-2xl font-semibold text-admin-dark">
                                {statusLabel} Orders <span className="text-admin-gray-500">({orders.length})</span>
                            </h4>
                        </div>
                    </div>
                    <Link to="/orders/create">
                        <Button variant="primary" rounded="md" icon={FiPlus}>
                            Create Order
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="rounded-2xl border border-admin-gray-200 bg-white shadow-card">
                <div className="p-6">
                    <div className="mb-6 rounded-xl border border-admin-gray-200 bg-admin-gray-50/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-admin-gray-500">Filters</p>
                                <p className="text-sm text-admin-gray-600">Search by keyword or date range</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="primary" rounded="md" onClick={handleFilterSubmit}>
                                    Apply
                                </Button>
                                <Button size="sm" variant="outline" rounded="md" onClick={handleFilterReset}>
                                    Reset
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <Input
                                label="Keyword"
                                type="text"
                                placeholder="Invoice, name, phone, IP"
                                value={filters.keyword}
                                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                                className="bg-white"
                            />
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Date Range</label>
                                <RangePicker
                                    value={filterRangeValue}
                                    format="YYYY-MM-DD"
                                    allowClear
                                    size='large'
                                    presets={filterRangePresets}
                                    style={{ width: '100%', maxWidth: 300 }}
                                    onChange={(_, dateStrings) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            start_date: dateStrings?.[0] || '',
                                            end_date: dateStrings?.[1] || '',
                                        }));
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Failed to load orders. {error?.data?.message || 'Please try again.'}
                        </div>
                    )}

                    <DataTable
                        columns={columns}
                        data={orders}
                        loading={loading}
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        className="rounded-xl border border-admin-gray-200 bg-white"
                    />
                </div>
            </div>
        </div>
    );
};

export default OrderList;
