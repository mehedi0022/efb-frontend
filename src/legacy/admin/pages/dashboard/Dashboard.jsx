import React, { useMemo, useState } from "react";
import {
  FiActivity,
  FiBox,
  FiCheckCircle,
  FiTruck,
  FiPauseCircle,
} from "react-icons/fi";
import { MdOutlineCancel } from "react-icons/md";

import { useNavigate } from "react-router-dom";

import { DatePicker } from "antd";
import dayjs from "dayjs";

import { formatCurrency, formatDateTime } from "../../utils/helpers";
import { useAdminFetchQuery } from "../../../store/adminApi";

const { RangePicker } = DatePicker;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMetric = (metric) => ({
  count: toNumber(metric?.count),
  amount: toNumber(metric?.amount),
});

const FbSentProductTable = ({ isFetching: parentFetching }) => {
  const navigate = useNavigate();

  const startDate = useMemo(
    () => dayjs().subtract(29, "day").format("YYYY-MM-DD"),
    [],
  );
  const endDate = useMemo(() => dayjs().format("YYYY-MM-DD"), []);

  const queryArgs = useMemo(
    () => ({
      url: "/admin/orders/fb-sent",
      params: {
        start_date: startDate,
        end_date: endDate,
        per_page: 9999,
      },
      tags: ["fb-sent-dashboard"],
    }),
    [startDate, endDate],
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useAdminFetchQuery(queryArgs, {
    pollingInterval: 60_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const loading = isLoading && !response;

  const rows = useMemo(() => {
    const orders = response?.data;
    if (!Array.isArray(orders)) return [];

    const grouped = {};
    orders.forEach((order) => {
      const sentRaw =
        order.fb_sent_at ||
        order.sent_at ||
        order.updated_at ||
        order.created_at ||
        "";
      const sentDate = sentRaw ? dayjs(sentRaw).format("YYYY-MM-DD") : null;
      if (!sentDate) return;

      if (!grouped[sentDate]) {
        grouped[sentDate] = {
          sent_date: sentDate,
          order_count: 0,
        };
      }
      grouped[sentDate].order_count += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => (a.sent_date < b.sent_date ? 1 : -1))
      .map((item) => ({
        ...item,
        is_today: item.sent_date === endDate,
      }));
  }, [response, endDate]);

  const totalOrders = useMemo(
    () => rows.reduce((sum, r) => sum + r.order_count, 0),
    [rows],
  );
  const totalAmount = useMemo(
    () => rows.reduce((sum, r) => sum + r.amount, 0),
    [rows],
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h5 className="text-lg font-bold text-gray-800">
            FB Sent — Last 30 Days
          </h5>
          <p className="text-xs text-gray-500 mt-0.5">
            {startDate} → {endDate}
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500">Total Orders</p>
            <p className="font-bold text-gray-800">
              {loading ? "—" : totalOrders.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error?.data?.message || "Failed to load FB Sent data."}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-base font-semibold tracking-wider">
              <th className="px-6 py-4">FB Sent Date</th>
              <th className="px-6 py-4">Orders</th>
              <th className="px-6 py-4">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td
                  className="px-6 py-6 text-center text-sm text-gray-500"
                  colSpan="3">
                  Loading FB Sent data...
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  className="px-6 py-6 text-center text-sm text-gray-500"
                  colSpan="3">
                  No FB Sent orders found in the last 30 days
                </td>
              </tr>
            )}

            {rows.map((item) => (
              <tr
                key={item.order_date}
                className={`transition-colors ${
                  item.is_today
                    ? "bg-blue-50 hover:bg-blue-100/70"
                    : "hover:bg-gray-50"
                }`}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {item.is_today && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white">
                        Today
                      </span>
                    )}
                    <span
                      className={`text-base font-medium ${item.is_today ? "text-blue-700" : "text-gray-700"}`}>
                      {dayjs(item.sent_date).format("DD MMM YYYY")}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className="text-base font-semibold text-gray-800">
                    {item.order_count.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() =>
                      navigate(
                        `/orders/fb-sent?start_date=${item.sent_date}&end_date=${item.sent_date}`,
                      )
                    }
                    className="text-blue-600 hover:text-blue-800 text-base font-medium hover:underline transition-colors">
                    View
                  </button>
                </td>
              </tr>
            ))}

            {isFetching && rows.length > 0 && (
              <tr>
                <td
                  className="px-6 py-2 text-center text-xs text-gray-400"
                  colSpan="3">
                  Refreshing...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProductOverviewTable = ({ isFetching: parentFetching }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // show 15 per page

  const queryArgs = useMemo(
    () => ({
      url: "/admin/dashboard/products",
      params: {},
      tags: ["dashboard-products"],
    }),
    [],
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useAdminFetchQuery(queryArgs, {
    pollingInterval: 60_000,
    refetchOnFocus: true,
  });

  const loading = isLoading && !response;
  const allProducts = response?.data || [];

  // Frontend pagination
  const totalPages = Math.ceil(allProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allProducts.slice(start, start + itemsPerPage);
  }, [allProducts, currentPage]);

  const resolveImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http://") || image.startsWith("https://"))
      return image;
    const normalized = image.replace(/^\/+/, "");
    if (normalized === "default.png" || normalized === "") return null;
    return `https://freelancerbangladesh.com/${normalized}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h5 className="text-lg font-bold text-gray-800">
            Top Selling Products
          </h5>
          <p className="text-xs text-gray-500 mt-1">
            Ranked by total quantity sold ({allProducts.length} products)
          </p>
        </div>
        {isFetching && (
          <span className="text-xs text-gray-400">Refreshing...</span>
        )}
      </div>

      {error && (
        <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error?.data?.message || "Failed to load product data."}
        </div>
      )}

      {loading ? (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          Loading products...
        </div>
      ) : allProducts.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-gray-500">
          No products found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3 w-8">#</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3 text-center">Qty Sold</th>
                  <th className="px-6 py-3 text-center">Orders</th>
                  <th className="px-6 py-3 text-right">Total Sale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.map((product, index) => {
                  const rank = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <tr
                      key={product.product_sku}
                      className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            rank === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : rank === 1
                                ? "bg-gray-100 text-gray-600"
                                : rank === 2
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-gray-50 text-gray-500"
                          }`}>
                          {rank + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              resolveImageUrl(product.image) ||
                              "https://via.placeholder.com/40"
                            }
                            alt={product.name}
                            className="h-10 w-10 rounded-lg object-cover ring-1 ring-gray-200"
                          />
                          <div>
                            <p className="font-medium text-gray-800">
                              {product.name || "-"}
                            </p>
                            <p className="text-xs text-gray-400">
                              SKU: {product.product_sku || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                          {toNumber(product.quantity_sold).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                          {toNumber(product.total_orders).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">
                        {formatCurrency(toNumber(product.total_sale))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, allProducts.length)} of{" "}
                {allProducts.length} products
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? "bg-admin-primary text-white"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}>
                      {page}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const DashboardCard = ({
  title,
  metric,
  icon: Icon,
  colorClass,
  iconBgClass,
  loading,
  url,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`rounded-xl p-6 ${colorClass} shadow-sm cursor-pointer hover:shadow-md transition-all duration-400 hover:scale-105`}
      onClick={() => {
        if (url) {
          navigate(url);
        }
      }}>
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center ${iconBgClass} shadow-inner`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-white font-medium text-sm mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">
            {loading ? "Loading..." : formatCurrency(metric.amount)}
          </h3>
          <p className="text-xs text-slate-200 mt-1">
            {loading
              ? "Updating..."
              : `${metric.count.toLocaleString()} orders`}
          </p>
        </div>
      </div>
    </div>
  );
};

const HourlyOrdersChart = ({ data = [], loading, windowHours = 24 }) => {
  const maxOrderCount = useMemo(
    () => Math.max(1, ...data.map((item) => toNumber(item.order_count))),
    [data],
  );

  const totalOrders = useMemo(
    () => data.reduce((sum, item) => sum + toNumber(item.order_count), 0),
    [data],
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h5 className="text-lg font-bold text-gray-800">
          Orders in Last {windowHours} Hours
        </h5>
        <span className="text-sm text-gray-500">
          {loading ? "Refreshing..." : `${totalOrders.toLocaleString()} orders`}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 text-sm">
          {loading
            ? "Loading hourly analytics..."
            : "No hourly order data found"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px] h-64 flex items-end gap-3">
            {data.map((point) => {
              const orderCount = toNumber(point.order_count);
              const barHeight = Math.max(
                (orderCount / maxOrderCount) * 100,
                orderCount > 0 ? 8 : 2,
              );

              return (
                <div
                  key={point.hour_start}
                  className="flex-1 min-w-[48px] flex flex-col items-center gap-2">
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
                  <span className="text-xs text-gray-500">
                    {point.hour_label}
                  </span>
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
  "#10b981",
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
];

const MonthlyOrdersPieChart = ({ data = [], loading }) => {
  const totalOrders = useMemo(
    () => data.reduce((sum, item) => sum + toNumber(item.order_count), 0),
    [data],
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
        <h5 className="text-lg font-bold text-gray-800">
          Orders in Last 12 Months
        </h5>
        <span className="text-sm text-gray-500">
          {loading ? "Refreshing..." : `${totalOrders.toLocaleString()} orders`}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 text-sm">
          {loading
            ? "Loading monthly analytics..."
            : "No monthly order data found"}
        </div>
      ) : (
        <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start">
          <div className="relative mx-auto h-[188px] w-[188px] shrink-0 2xl:mx-0">
            <svg
              viewBox={`0 0 ${chartSize} ${chartSize}`}
              className="h-full w-full">
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
              <span className="text-xs uppercase tracking-wide text-gray-500">
                Total
              </span>
              <span className="text-xl font-bold text-gray-800">
                {totalOrders.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">orders</span>
            </div>
          </div>

          <div className="w-full min-w-0">
            <ul className="grid grid-flow-col grid-rows-2 auto-cols-[minmax(170px,1fr)] gap-2 overflow-x-auto pb-1 pr-1 no-scrollbar">
              {data.map((item, index) => {
                const count = toNumber(item.order_count);
                const percentage =
                  totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;

                return (
                  <li
                    key={item.month || index}
                    className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-tight text-gray-700 break-words">
                          {item.month_label || "-"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-gray-800">
                          {count.toLocaleString()}{" "}
                          <span className="font-medium text-gray-500">
                            ({percentage}%)
                          </span>
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
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
  });

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

  const filterRangeValue = useMemo(() => {
    const start = filters.start_date
      ? dayjs(filters.start_date, "YYYY-MM-DD")
      : null;
    const end = filters.end_date ? dayjs(filters.end_date, "YYYY-MM-DD") : null;

    if (!start && !end) return null;

    return [start, end];
  }, [filters.start_date, filters.end_date]);

  const queryArgs = useMemo(
    () => ({
      url: "/admin/dashboard",
      params: {
        hours: 24,
        ...(filters.start_date ? { start_date: filters.start_date } : {}),
        ...(filters.end_date ? { end_date: filters.end_date } : {}),
      },
      tags: ["dashboard"],
    }),
    [filters.end_date, filters.start_date],
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useAdminFetchQuery(queryArgs, {
    pollingInterval: 30_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const loading = (isLoading && !response) || (isFetching && !response);

  const stats = useMemo(() => {
    const apiStats = response?.stats || {};

    return {
      total: toMetric(apiStats.total_order),
      active: toMetric(apiStats.active_order),
      completed: toMetric(apiStats.completed_order),
      noResponse: toMetric(apiStats.no_response_order),
      inCourier: toMetric(apiStats.in_courier_order),
      fbSent: toMetric(apiStats.fb_sent_order),
      cancelled: toMetric(apiStats.cancelled_order),
    };
  }, [response]);

  const hourlyData = useMemo(() => {
    const source = response?.hourly_orders?.data;
    if (!Array.isArray(source)) {
      return [];
    }

    return source.map((item) => ({
      hour_start: item?.hour_start || "",
      hour_label: item?.hour_label || "",
      order_count: toNumber(item?.order_count),
      amount: toNumber(item?.amount),
    }));
  }, [response]);

  const hourlyWindowHours = useMemo(
    () => Math.max(1, toNumber(response?.hourly_orders?.window_hours) || 24),
    [response?.hourly_orders?.window_hours],
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
      month: item?.month || "",
      month_label: item?.month_label || "",
      order_count: toNumber(item?.order_count),
      amount: toNumber(item?.amount),
    }));
  }, [response]);

  return (
    <div className="container-fluid space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load dashboard data.{" "}
          {error?.data?.message || "Please try again."}
        </div>
      )}

      <div>
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Orders Overview
          </h4>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Filter Date Range
            </label>
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
            url="/orders/all"
            colorClass="bg-[#52d1a2]"
            iconBgClass="bg-cyan-500"
          />
          <DashboardCard
            title="New Orders"
            metric={stats.active}
            icon={FiActivity}
            loading={loading}
            url="/orders/new-order"
            colorClass="bg-[#3b82f5]"
            iconBgClass="bg-emerald-500"
          />
          <DashboardCard
            title="Completed Orders"
            metric={stats.completed}
            icon={FiCheckCircle}
            loading={loading}
            url="/orders/complete"
            colorClass="bg-[#109e71]"
            iconBgClass="bg-blue-500"
          />
          <DashboardCard
            title="In Courier"
            metric={stats.inCourier}
            icon={FiTruck}
            loading={loading}
            url="/orders/in-courier"
            colorClass="bg-[#7360DF]"
            iconBgClass="bg-violet-500"
          />
          <DashboardCard
            title="FB Sent"
            metric={stats.fbSent}
            icon={FiCheckCircle}
            loading={loading}
            url="/orders/fb-sent"
            colorClass="bg-[#37B7C3]"
            iconBgClass="bg-teal-800"
          />
          <DashboardCard
            title="Cancel Orders"
            metric={stats.cancelled}
            icon={MdOutlineCancel}
            loading={loading}
            url="/orders/cancel"
            colorClass="bg-[#FF0000]"
            iconBgClass="bg-red-800"
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
        <ProductOverviewTable isFetching={isFetching} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <FbSentProductTable isFetching={isFetching} />
      </div>
    </div>
  );
};

export default Dashboard;
