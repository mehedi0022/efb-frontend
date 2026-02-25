import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { formatCurrency } from '../../utils/helpers';
import { useAdminFetchQuery } from '../../../store/adminApi';

const OrderReport = () => {
    const [summary, setSummary] = useState({
        total_purchase: 0,
        total_sales: 0,
        total_item: 0,
        additional_cost: 0,
    });
    const [filters, setFilters] = useState({
        keyword: '',
        user_id: '',
        start_date: '',
        end_date: '',
    });
    const [appliedFilters, setAppliedFilters] = useState({
        keyword: '',
        user_id: '',
        start_date: '',
        end_date: '',
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const queryArgs = useMemo(() => ({
        url: '/admin/reports/orders',
        params: {
            ...appliedFilters,
            page: pagination.current_page,
            per_page: 20,
        },
        tags: ['order-report'],
    }), [appliedFilters, pagination.current_page]);

    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const loading = isLoading || isFetching;
    const orders = response?.data || [];
    const users = response?.users || [];

    useEffect(() => {
        if (response?.summary) {
            setSummary(response.summary);
        }
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const columns = [
        { header: 'Invoice', accessor: 'order', render: (row) => row.order?.invoice_id || '' },
        { header: 'Customer', accessor: 'shipping', render: (row) => row.shipping?.name || '' },
        { header: 'Phone', accessor: 'shipping_phone', render: (row) => row.shipping?.phone || '' },
        { header: 'Product', accessor: 'product_name' },
        { header: 'Purchase', accessor: 'purchase_price' },
        { header: 'Sale', accessor: 'sale_price' },
        { header: 'COD %', accessor: 'cod', render: (row) => row.cod ? `${row.cod}%` : '0%' },
        { header: 'COD Amount', accessor: 'cod_value', render: (row) => row.cod_value ?? '0' },
        {
            header: 'Additional Type',
            accessor: 'addi_percentage',
            render: (row) => (row.addi_percentage ? `${row.addi_percentage}%` : 'Fixed'),
        },
        { header: 'Additional Cost', accessor: 'additional_cost', render: (row) => row.additional_cost ?? '0' },
        { header: 'Courier Cost', accessor: 'courier_cost', render: (row) => row.courier_cost ?? '0' },
        { header: 'Qty', accessor: 'qty' },
        { header: 'Total', accessor: 'total', render: (row) => row.qty * row.sale_price },
    ];

    return (
        <div className="container-fluid">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Order Reports</h2>
            </div>

            <div className="bg-white rounded-lg shadow-card p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input
                        placeholder="Keyword"
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    />
                    <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={filters.user_id}
                        onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                    >
                        <option value="">All Users</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                    <Input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    />
                    <Input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    />
                </div>
                <div className="flex gap-2 mt-3">
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                            setPagination((prev) => ({ ...prev, current_page: 1 }));
                            setAppliedFilters(filters);
                        }}
                    >
                        Apply
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                            const reset = { keyword: '', user_id: '', start_date: '', end_date: '' };
                            setFilters(reset);
                            setAppliedFilters(reset);
                            setPagination((prev) => ({ ...prev, current_page: 1 }));
                        }}
                    >
                        Reset
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-card">
                <DataTable
                    columns={columns}
                    data={orders}
                    loading={loading}
                    pagination={pagination}
                    onPageChange={(page) => setPagination({ ...pagination, current_page: page })}
                />
            </div>

            <div className="bg-white rounded-lg shadow-card p-4 mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <div className="text-sm text-gray-500">Total Purchase</div>
                    <div className="font-semibold">{formatCurrency(summary.total_purchase)}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500">Total Sales</div>
                    <div className="font-semibold">{formatCurrency(summary.total_sales)}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500">Additional Cost</div>
                    <div className="font-semibold">{formatCurrency(summary.additional_cost)}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500">Total Items</div>
                    <div className="font-semibold">{summary.total_item}</div>
                </div>
            </div>
        </div>
    );
};

export default OrderReport;
