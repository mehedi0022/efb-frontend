import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiEye, FiFilter, FiRefreshCw, FiRotateCcw, FiTruck } from "react-icons/fi";
import { Button as AntButton, DatePicker, Input as AntInput, Table } from "antd";
import dayjs from "dayjs";
import Badge from "../../components/common/Badge";
import {
  formatCurrency,
  formatDateTime,
  getStatusColor,
} from "../../utils/helpers";
import {
  showConfirmAlert,
  showErrorMessage,
  showSuccessAlert,
} from "../../utils/alerts";
import {
  useAdminActionMutation,
  useAdminFetchQuery,
} from "../../../store/adminApi";

const { RangePicker } = DatePicker;

const CourierOrderList = () => {
  const [filters, setFilters] = useState({
    courier: "",
    name: "",
    tracking_code: "",
    start_date: "",
    end_date: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    courier: "",
    name: "",
    tracking_code: "",
    start_date: "",
    end_date: "",
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const queryArgs = useMemo(
    () => ({
      url: "/admin/orders/courier/list",
      params: {
        page: pagination.current_page,
        ...appliedFilters,
      },
      tags: ["orders", "courier-orders"],
    }),
    [pagination.current_page, appliedFilters],
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useAdminFetchQuery(queryArgs);
  const [adminAction] = useAdminActionMutation();
  const orders = response?.data || [];
  const loading = (isLoading && !response) || isFetching;
  const perPage = Number(response?.pagination?.per_page || 20);

  const resolveTrackingUrl = (order) => {
    const trackingCode = String(order?.courier_order_id || "").trim();
    if (!trackingCode) return "";

    const courierName = String(order?.courier_name || "")
      .trim()
      .toLowerCase();
    if (courierName === "pathao") {
      return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(trackingCode)}`;
    }
    if (courierName === "steadfast") {
      return `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}`;
    }

    return `https://www.google.com/search?q=${encodeURIComponent(`tracking ${trackingCode}`)}`;
  };

  React.useEffect(() => {
    if (!response?.pagination) return;
    setPagination((prev) => ({ ...prev, ...response.pagination }));
  }, [response]);

  const handleApplyFilter = () => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    setAppliedFilters(filters);
    setSelectedOrderIds([]);
  };

  const handleResetFilter = () => {
    const reset = {
      courier: "",
      name: "",
      tracking_code: "",
      start_date: "",
      end_date: "",
    };
    setFilters(reset);
    setAppliedFilters(reset);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    setSelectedOrderIds([]);
  };

  const handleSyncStatus = async () => {
    if (!selectedOrderIds.length) {
      showErrorMessage("Select at least one order to sync.");
      return;
    }

    const confirmed = await showConfirmAlert({
      title: "Sync Courier Status?",
      content: `This will sync ${selectedOrderIds.length} selected courier order(s).`,
      okText: "Yes, Sync",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setSyncing(true);
    try {
      const result = await adminAction({
        url: "/admin/orders/courier/sync-status",
        method: "POST",
        body: { order_ids: selectedOrderIds },
        invalidates: ["orders", "courier-orders"],
        notifySuccess: false,
      }).unwrap();

      showSuccessAlert({
        title: "Sync Complete",
        content: result?.message || "Courier status synced successfully.",
      });

      setSelectedOrderIds([]);
    } catch (syncError) {
      showErrorMessage(
        syncError?.data?.message || "Failed to sync courier status.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    {
      header: "Invoice",
      accessor: "invoice_id",
      width: "12%",
    },
    {
      header: "Courier",
      accessor: "courier_name",
      width: "10%",
      render: (row) => (
        <Badge color={row.courier_name === "pathao" ? "info" : "warning"}>
          {String(row.courier_name || "-").toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Courier Status",
      accessor: "courier_status",
      width: "13%",
      render: (row) => (
        <Badge color={getStatusColor(row.courier_status)}>
          {row.courier_status || "Unknown"}
        </Badge>
      ),
    },
    {
      header: "Order Status",
      accessor: "status_name",
      width: "13%",
      render: (row) => (
        <Badge color={getStatusColor(row.status_name)}>
          {row.status_name || row?.status?.name || "Unknown"}
        </Badge>
      ),
    },
    {
      header: "Customer",
      accessor: "customer",
      width: "16%",
      render: (row) => (
        <div className="text-xs">
          <p>{row?.shipping?.name || "-"}</p>
          <p>{row?.shipping?.phone || "-"}</p>
        </div>
      ),
    },
    {
      header: "Amount",
      accessor: "amount",
      width: "10%",
      render: (row) => formatCurrency(Number(row.amount || 0)),
    },
    {
      header: "Last Synced",
      accessor: "courier_synced_at",
      width: "14%",
      render: (row) => (
        <span className="text-xs">
          {row.courier_synced_at ? formatDateTime(row.courier_synced_at) : "-"}
        </span>
      ),
    },
    {
      header: "Tracking",
      accessor: "courier_order_id",
      width: "14%",
      render: (row) => {
        const trackingCode = String(row?.courier_order_id || "").trim();
        if (!trackingCode) {
          return <span className="text-xs text-gray-400">-</span>;
        }

        const trackingUrl = resolveTrackingUrl(row);
        return (
          <div className="space-y-1">
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <AntButton
                  size="small"
                  type="primary"
                  icon={<FiTruck size={13} />}
                >
                  Track
                </AntButton>
              </a>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Action",
      accessor: "action",
      width: 150,
      fixed: "right",
      render: (row) => (
        <Link to={`/orders/invoice/${row.invoice_id}`}>
          <AntButton size="small" type="primary" icon={<FiEye size={13} />}>
            View
          </AntButton>
        </Link>
      ),
    },
  ];

  const antdColumns = useMemo(
    () =>
      columns.map((column) => ({
        title: column.header,
        dataIndex: column.accessor,
        key: column.accessor,
        width: column.width,
        fixed: column.fixed,
        render: (_, row, index) =>
          column.render ? column.render(row, index) : row?.[column.accessor],
      })),
    [columns],
  );

  const rowSelection = {
    selectedRowKeys: selectedOrderIds,
    onChange: (keys) => {
      const normalized = keys
        .map((key) => Number(key))
        .filter((key) => Number.isFinite(key) && key > 0);
      setSelectedOrderIds(normalized);
    },
    preserveSelectedRowKeys: true,
  };

  return (
    <div className="container-fluid">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Orders</p>
          <h2 className="text-2xl font-bold text-gray-900">
            Courier Orders List
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <AntButton
            type="primary"
            icon={<FiRefreshCw size={13} />}
            onClick={handleSyncStatus}
            disabled={syncing || selectedOrderIds.length === 0}
          >
            {syncing
              ? "Syncing..."
              : `Sync Status (${selectedOrderIds.length})`}
          </AntButton>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="px-4 py-5 md:px-5">
          <div className="mb-6 rounded-xl border border-slate-200/70 bg-admin-gray-50/70 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Courier
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={filters.courier}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, courier: e.target.value }))
                  }
                >
                  <option value="">All</option>
                  <option value="pathao">Pathao</option>
                  <option value="steadfast">Steadfast</option>
                  </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Filter by Name
                </label>
                <AntInput
                  size="large"
                  placeholder="Customer name"
                  value={filters.name}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Filter by Tracking Code
                </label>
                <AntInput
                  size="large"
                  placeholder="Tracking code"
                  value={filters.tracking_code}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      tracking_code: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date Range
                </label>
                <RangePicker
                  value={
                    filters.start_date || filters.end_date
                      ? [
                          filters.start_date
                            ? dayjs(filters.start_date, "YYYY-MM-DD")
                            : null,
                          filters.end_date
                            ? dayjs(filters.end_date, "YYYY-MM-DD")
                            : null,
                        ]
                      : null
                  }
                  format="YYYY-MM-DD"
                  allowClear
                  size="large"
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

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <AntButton
                type="primary"
                icon={<FiFilter size={13} />}
                onClick={handleApplyFilter}
              >
                Apply
              </AntButton>
              <AntButton icon={<FiRotateCcw size={13} />} onClick={handleResetFilter}>
                Reset
              </AntButton>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load courier orders.{" "}
              {error?.data?.message || "Please try again."}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
            <Table
              className="admin-orders-table"
              rowKey={(record) => Number(record.id)}
              columns={antdColumns}
              dataSource={orders}
              loading={loading}
              rowSelection={rowSelection}
              pagination={{
                current: Number(pagination.current_page || 1),
                pageSize: perPage,
                total: Number(pagination.total || 0),
                showSizeChanger: false,
                onChange: (page) =>
                  setPagination((prev) => ({ ...prev, current_page: page })),
              }}
              scroll={{ x: 1550 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierOrderList;
