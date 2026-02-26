import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { FiRefreshCw, FiEye } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { formatCurrency, formatDateTime, getStatusColor } from '../../utils/helpers';
import { showConfirmAlert, showErrorMessage, showSuccessAlert } from '../../utils/alerts';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';

const { RangePicker } = DatePicker;

const CourierOrderList = () => {
    const [filters, setFilters] = useState({
        courier: '',
        status: '',
        start_date: '',
        end_date: '',
    });
    const [appliedFilters, setAppliedFilters] = useState({
        courier: '',
        status: '',
        start_date: '',
        end_date: '',
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [selectionResetKey, setSelectionResetKey] = useState(0);

    const queryArgs = useMemo(() => ({
        url: '/admin/orders/courier/list',
        params: {
            page: pagination.current_page,
            ...appliedFilters,
        },
        tags: ['orders', 'courier-orders'],
    }), [pagination.current_page, appliedFilters]);

    const { data: response, isLoading, isFetching, error } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const orders = response?.data || [];
    const loading = (isLoading && !response) || isFetching;

    React.useEffect(() => {
        if (!response?.pagination) return;
        setPagination((prev) => ({ ...prev, ...response.pagination }));
    }, [response]);

    const handleApplyFilter = () => {
        setPagination((prev) => ({ ...prev, current_page: 1 }));
        setAppliedFilters(filters);
        setSelectedOrderIds([]);
        setSelectionResetKey((prev) => prev + 1);
    };

    const handleResetFilter = () => {
        const reset = { courier: '', status: '', start_date: '', end_date: '' };
        setFilters(reset);
        setAppliedFilters(reset);
        setPagination((prev) => ({ ...prev, current_page: 1 }));
        setSelectedOrderIds([]);
        setSelectionResetKey((prev) => prev + 1);
    };

    const handleSyncStatus = async () => {
        if (!selectedOrderIds.length) {
            showErrorMessage('Select at least one order to sync.');
            return;
        }

        const confirmed = await showConfirmAlert({
            title: 'Sync Courier Status?',
            content: `This will sync ${selectedOrderIds.length} selected courier order(s).`,
            okText: 'Yes, Sync',
            cancelText: 'Cancel',
        });

        if (!confirmed) return;

        setSyncing(true);
        try {
            const result = await adminAction({
                url: '/admin/orders/courier/sync-status',
                method: 'POST',
                body: { order_ids: selectedOrderIds },
                invalidates: ['orders', 'courier-orders'],
                notifySuccess: false,
            }).unwrap();

            showSuccessAlert({
                title: 'Sync Complete',
                content: result?.message || 'Courier status synced successfully.',
            });

            setSelectedOrderIds([]);
            setSelectionResetKey((prev) => prev + 1);
        } catch (syncError) {
            showErrorMessage(syncError?.data?.message || 'Failed to sync courier status.');
        } finally {
            setSyncing(false);
        }
    };

    const columns = [
        {
            header: 'Invoice',
            accessor: 'invoice_id',
            width: '12%',
        },
        {
            header: 'Courier',
            accessor: 'courier_name',
            width: '10%',
            render: (row) => (
                <Badge color={row.courier_name === 'pathao' ? 'info' : 'warning'}>
                    {String(row.courier_name || '-').toUpperCase()}
                </Badge>
            ),
        },
        {
            header: 'Courier Status',
            accessor: 'courier_status',
            width: '13%',
            render: (row) => (
                <Badge color={getStatusColor(row.courier_status)}>
                    {row.courier_status || 'Unknown'}
                </Badge>
            ),
        },
        {
            header: 'Order Status',
            accessor: 'status_name',
            width: '13%',
            render: (row) => (
                <Badge color={getStatusColor(row.status_name)}>
                    {row.status_name || row?.status?.name || 'Unknown'}
                </Badge>
            ),
        },
        {
            header: 'Customer',
            accessor: 'customer',
            width: '16%',
            render: (row) => (
                <div className="text-xs">
                    <p>{row?.shipping?.name || '-'}</p>
                    <p>{row?.shipping?.phone || '-'}</p>
                </div>
            ),
        },
        {
            header: 'Amount',
            accessor: 'amount',
            width: '10%',
            render: (row) => formatCurrency(Number(row.amount || 0)),
        },
        {
            header: 'Last Synced',
            accessor: 'courier_synced_at',
            width: '14%',
            render: (row) => (
                <span className="text-xs">
                    {row.courier_synced_at ? formatDateTime(row.courier_synced_at) : '-'}
                </span>
            ),
        },
        {
            header: 'Action',
            accessor: 'action',
            width: '8%',
            render: (row) => (
                <Link to={`/orders/invoice/${row.invoice_id}`} title="View Invoice">
                    <FiEye className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                </Link>
            ),
        },
    ];

    return (
        <div className="container-fluid">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-gray-500">Orders</p>
                    <h2 className="text-2xl font-bold text-gray-900">Courier Orders List</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="primary"
                        rounded="md"
                        icon={FiRefreshCw}
                        onClick={handleSyncStatus}
                        disabled={syncing || selectedOrderIds.length === 0}
                    >
                        {syncing ? 'Syncing...' : `Sync Status (${selectedOrderIds.length})`}
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border border-admin-gray-200 bg-white shadow-card">
                <div className="p-6">
                    <div className="mb-6 rounded-xl border border-admin-gray-200 bg-admin-gray-50/70 p-4">
                        <div className="grid gap-3 md:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Courier</label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={filters.courier}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, courier: e.target.value }))}
                                >
                                    <option value="">All</option>
                                    <option value="pathao">Pathao</option>
                                    <option value="steadfast">Steadfast</option>
                                </select>
                            </div>
                            <Input
                                label="Courier Status"
                                placeholder="sent / failed / synced"
                                value={filters.status}
                                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                            />
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Date Range</label>
                                <RangePicker
                                    value={
                                        filters.start_date || filters.end_date
                                            ? [
                                                filters.start_date ? dayjs(filters.start_date, 'YYYY-MM-DD') : null,
                                                filters.end_date ? dayjs(filters.end_date, 'YYYY-MM-DD') : null,
                                            ]
                                            : null
                                    }
                                    format="YYYY-MM-DD"
                                    allowClear
                                    size="large"
                                    style={{ width: '100%' }}
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

                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="primary" rounded="md" onClick={handleApplyFilter}>
                                Apply
                            </Button>
                            <Button size="sm" variant="outline" rounded="md" onClick={handleResetFilter}>
                                Reset
                            </Button>
                        </div>
                    </div>

                    {error ? (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Failed to load courier orders. {error?.data?.message || 'Please try again.'}
                        </div>
                    ) : null}

                    <DataTable
                        columns={columns}
                        data={orders}
                        loading={loading}
                        selectable
                        selectedRowIds={selectedOrderIds}
                        onSelectionChange={setSelectedOrderIds}
                        selectionResetKey={selectionResetKey}
                        pagination={pagination}
                        onPageChange={(page) => setPagination((prev) => ({ ...prev, current_page: page }))}
                        className="rounded-xl border border-admin-gray-200 bg-white"
                    />
                </div>
            </div>
        </div>
    );
};

export default CourierOrderList;

