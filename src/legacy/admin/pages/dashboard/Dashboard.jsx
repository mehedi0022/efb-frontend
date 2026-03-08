import React, { useMemo, useState } from 'react';
import {
    FiActivity,
    FiBox,
    FiCheckCircle,
    FiTruck,
    FiXCircle,
    FiPauseCircle 
} from 'react-icons/fi';

import { DatePicker } from "antd";
import dayjs from "dayjs";


import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { useAdminFetchQuery } from '../../../store/adminApi';




const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toMetric = (metric) => ({
    count: toNumber(metric?.count),
    amount: toNumber(metric?.amount),
});

const DashboardCard = ({ title, metric, icon: Icon, colorClass, iconBgClass, loading }) => (
    <div className={`rounded-xl p-6 ${colorClass} shadow-sm`}>
        <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${iconBgClass} shadow-inner`}>
                <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
                <p className="text-gray-600 font-medium text-sm mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">
                    {loading ? 'Loading...' : formatCurrency(metric.amount)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                    {loading ? 'Updating...' : `${metric.count.toLocaleString()} orders`}
                </p>
            </div>
        </div>
    </div>
);

const HourlyOrdersChart = ({ data = [], loading, windowHours = 24 }) => {
    const maxOrderCount = useMemo(
        () => Math.max(1, ...data.map((item) => toNumber(item.order_count))),
        [data]
    );

    const totalOrders = useMemo(
        () => data.reduce((sum, item) => sum + toNumber(item.order_count), 0),
        [data]
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
                <h5 className="text-lg font-bold text-gray-800">
                    Orders in Last {windowHours} Hours
                </h5>
                <span className="text-sm text-gray-500">
                    {loading ? 'Refreshing...' : `${totalOrders.toLocaleString()} orders`}
                </span>
            </div>

            {data.length === 0 ? (
                <div className="h-56 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 text-sm">
                    {loading ? 'Loading hourly analytics...' : 'No hourly order data found'}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[720px] h-64 flex items-end gap-3">
                        {data.map((point) => {
                            const orderCount = toNumber(point.order_count);
                            const barHeight = Math.max((orderCount / maxOrderCount) * 100, orderCount > 0 ? 8 : 2);

                            return (
                                <div key={point.hour_start} className="flex-1 min-w-[48px] flex flex-col items-center gap-2">
                                    <div className="relative h-52 w-full flex items-end">
                                        <div
                                            className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-300 transition-all duration-300"
                                            style={{ height: `${barHeight}%` }}
                                            title={`${point.hour_label}: ${orderCount} orders`}
                                        />
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-600">
                                            {orderCount}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">{point.hour_label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const PIE_COLORS = [
    '#10b981',
    '#22c55e',
    '#84cc16',
    '#eab308',
    '#f59e0b',
    '#f97316',
    '#ef4444',
    '#ec4899',
    '#a855f7',
    '#6366f1',
    '#3b82f6',
    '#06b6d4',
];

const MonthlyOrdersPieChart = ({ data = [], loading }) => {
    const totalOrders = useMemo(
        () => data.reduce((sum, item) => sum + toNumber(item.order_count), 0),
        [data]
    );

    const chartSize = 188;
    const strokeWidth = 24;
    const radius = (chartSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulated = 0;
    const slices = data.map((item, index) => {
        const value = toNumber(item.order_count);
        const length = totalOrders > 0 ? (value / totalOrders) * circumference : 0;
        const slice = {
            key: item.month || `${index}`,
            color: PIE_COLORS[index % PIE_COLORS.length],
            length,
            offset: accumulated,
        };
        accumulated += length;
        return slice;
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
                <h5 className="text-lg font-bold text-gray-800">Orders in Last 12 Months</h5>
                <span className="text-sm text-gray-500">
                    {loading ? 'Refreshing...' : `${totalOrders.toLocaleString()} orders`}
                </span>
            </div>

            {data.length === 0 ? (
                <div className="h-56 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 text-sm">
                    {loading ? 'Loading monthly analytics...' : 'No monthly order data found'}
                </div>
            ) : (
                <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start">
                    <div className="relative mx-auto h-[188px] w-[188px] shrink-0 2xl:mx-0">
                        <svg viewBox={`0 0 ${chartSize} ${chartSize}`} className="h-full w-full">
                            <circle
                                cx={chartSize / 2}
                                cy={chartSize / 2}
                                r={radius}
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth={strokeWidth}
                            />
                            {slices.map((slice) => (
                                <circle
                                    key={slice.key}
                                    cx={chartSize / 2}
                                    cy={chartSize / 2}
                                    r={radius}
                                    fill="none"
                                    stroke={slice.color}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="butt"
                                    strokeDasharray={`${slice.length} ${Math.max(circumference - slice.length, 0)}`}
                                    strokeDashoffset={-slice.offset}
                                    transform={`rotate(-90 ${chartSize / 2} ${chartSize / 2})`}
                                />
                            ))}
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs uppercase tracking-wide text-gray-500">Total</span>
                            <span className="text-xl font-bold text-gray-800">{totalOrders.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">orders</span>
                        </div>
                    </div>

                    <div className="w-full min-w-0">
                        <ul className="grid grid-flow-col grid-rows-2 auto-cols-[minmax(170px,1fr)] gap-2 overflow-x-auto pb-1 pr-1 no-scrollbar">
                            {data.map((item, index) => {
                                const count = toNumber(item.order_count);
                                const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;

                                return (
                                    <li key={item.month || index} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                                        <div className="flex items-start gap-2">
                                            <span
                                                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-[13px] leading-tight text-gray-700 break-words">
                                                    {item.month_label || '-'}
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-gray-800">
                                                    {count.toLocaleString()} <span className="font-medium text-gray-500">({percentage}%)</span>
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

const Dashboard = () => {
    const {
        data: response,
        isLoading,
        isFetching,
        error,
    } = useAdminFetchQuery(
        {
            url: '/admin/dashboard',
            params: { hours: 24 },
            tags: ['dashboard'],
        },
        {
            pollingInterval: 30_000,
            refetchOnFocus: true,
            refetchOnReconnect: true,
        }
    );

    const loading = (isLoading && !response) || (isFetching && !response);

    const stats = useMemo(() => {
        const apiStats = response?.stats || {};

        return {
            total: toMetric(apiStats.total_order),
            active: toMetric(apiStats.active_order),
            completed: toMetric(apiStats.completed_order),
            noResponse: toMetric(apiStats.no_response_order),
            inCourier: toMetric(apiStats.in_courier_order),
            cancelled: toMetric(apiStats.cancelled_order),
        };
    }, [response]);

    const hourlyData = useMemo(() => {
        const source = response?.hourly_orders?.data;
        if (!Array.isArray(source)) {
            return [];
        }

        return source.map((item) => ({
            hour_start: item?.hour_start || '',
            hour_label: item?.hour_label || '',
            order_count: toNumber(item?.order_count),
            amount: toNumber(item?.amount),
        }));
    }, [response]);

    const hourlyWindowHours = useMemo(
        () => Math.max(1, toNumber(response?.hourly_orders?.window_hours) || 24),
        [response?.hourly_orders?.window_hours]
    );

    const latestOrders = useMemo(() => {
        const source = response?.latest_orders;
        if (!Array.isArray(source)) {
            return [];
        }
        return source.slice(0, 8);
    }, [response]);

    const monthlyData = useMemo(() => {
        const source = response?.monthly_orders?.data;
        if (!Array.isArray(source)) {
            return [];
        }

        return source.map((item) => ({
            month: item?.month || '',
            month_label: item?.month_label || '',
            order_count: toNumber(item?.order_count),
            amount: toNumber(item?.amount),
        }));
    }, [response]);

const { RangePicker } = DatePicker;

const filterRangePresets = useMemo(
    () => [
      {
        label: "Last 7 Days",
        value: [
          dayjs().subtract(6, "day").startOf("day"),
          dayjs().endOf("day"),
        ],
      },
      {
        label: "Last 30 Days",
        value: [
          dayjs().subtract(29, "day").startOf("day"),
          dayjs().endOf("day"),
        ],
      },
      {
        label: "Last 90 Days",
        value: [
          dayjs().subtract(89, "day").startOf("day"),
          dayjs().endOf("day"),
        ],
      },
    ],
    [],
  );

const [filters, setFilters] = useState({
    name: "",
    tracking_code: "",
    start_date: "",
    end_date: "",
  });

const filterRangeValue = useMemo(() => {
    const start = filters.start_date
      ? dayjs(filters.start_date, "YYYY-MM-DD")
      : null;
    const end = filters.end_date ? dayjs(filters.end_date, "YYYY-MM-DD") : null;

    if (!start && !end) return null;
    return [start, end];
  }, [filters.start_date, filters.end_date]);

    return (
        <div className="container-fluid space-y-8">
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Failed to load dashboard data. {error?.data?.message || 'Please try again.'}
                </div>
            )}

                <div>
                    <div className='mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
                        <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">Orders Overview</h4>
                  
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Filter Date Range</label>
                        <RangePicker
                        value={filterRangeValue}
                        format="YYYY-MM-DD"
                        allowClear
                        size="large"
                        presets={filterRangePresets}
                        style={{ width: "100%" }}
                        onChange={(_, dateStrings) => {
                            setFilters((prev) => ({
                            ...prev,
                            start_date: dateStrings?.[0] || "",
                            end_date: dateStrings?.[1] || "",
                            }));
                        }}
                        />
                    </div>                  
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DashboardCard
                        title="All Orders"
                        metric={stats.total}
                        icon={FiBox}
                        loading={loading}
                        colorClass="bg-[#f0f9ff]"
                        iconBgClass="bg-cyan-500"
                    />
                    <DashboardCard
                        title="New Orders"
                        metric={stats.active}
                        icon={FiActivity}
                        loading={loading}
                        colorClass="bg-[#ecfdf5]"
                        iconBgClass="bg-emerald-500"
                    />
                    <DashboardCard
                        title="Completed Orders"
                        metric={stats.completed}
                        icon={FiCheckCircle}
                        loading={loading}
                        colorClass="bg-[#eff6ff]"
                        iconBgClass="bg-blue-500"
                    />
                    <DashboardCard
                        title="In Courier"
                        metric={stats.noResponse}
                        icon={FiTruck}
                        loading={loading}
                        colorClass="bg-[#f5f3ff]"
                        iconBgClass="bg-violet-500"
                    />
                    <DashboardCard
                        title="FB Sent"
                        metric={stats.inCourier}
                        icon={FiCheckCircle}
                        loading={loading}
                        colorClass="bg-[#eefcf5]"
                        iconBgClass="bg-teal-500"
                    />
                    <DashboardCard
                        title="Hold Orders"
                        metric={stats.cancelled}
                        icon={FiPauseCircle}
                        loading={loading}
                        colorClass="bg-[#fef2f2]"
                        iconBgClass="bg-yellow-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <HourlyOrdersChart
                    data={hourlyData}
                    loading={isFetching}
                    windowHours={hourlyWindowHours}
                />
                <MonthlyOrdersPieChart data={monthlyData} loading={isFetching} />
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h5 className="text-lg font-bold text-gray-800">Latest Orders</h5>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold tracking-wider">
                                    <th className="px-6 py-4">Invoice</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Ordered At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {latestOrders.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-4 text-center text-sm text-gray-500" colSpan="5">
                                            {loading ? 'Loading latest orders...' : 'No orders found'}
                                        </td>
                                    </tr>
                                )}

                                {latestOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-blue-600 font-medium">
                                            #{order.invoice_id}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {order.customer?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {formatCurrency(toNumber(order.amount))}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {order.status_label || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {order.created_at ? formatDateTime(order.created_at) : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {isFetching && latestOrders.length > 0 && (
                                    <tr>
                                        <td className="px-6 py-3 text-center text-xs text-gray-500" colSpan="5">
                                            Refreshing data...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
