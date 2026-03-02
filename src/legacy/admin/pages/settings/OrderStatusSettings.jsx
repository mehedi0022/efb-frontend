import React, { useEffect, useMemo, useState } from "react";
import { Input, Table } from "antd";
import { useAdminFetchQuery } from "../../../store/adminApi";

const OrderStatusSettings = () => {
  const [keyword, setKeyword] = useState("");
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 20,
  });

  const tagKey = "order-statuses";
  const queryArgs = useMemo(
    () => ({
      url: "/admin/order-statuses",
      params: {
        keyword,
        page: pagination.current_page,
        per_page: pagination.per_page,
      },
      tags: [tagKey],
    }),
    [keyword, pagination.current_page, pagination.per_page],
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useAdminFetchQuery(queryArgs);

  const statuses = response?.data || [];
  const loading = isLoading || isFetching;
  const pageSize = Number(response?.pagination?.per_page || pagination.per_page);

  useEffect(() => {
    if (!response?.pagination) return;
    setPagination((prev) => ({ ...prev, ...response.pagination }));
  }, [response]);

  const columns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        width: 90,
      },
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        width: 240,
      },
      {
        title: "Slug",
        dataIndex: "slug",
        key: "slug",
        width: 260,
      },
      {
        title: "State",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value) =>
          Number(value) === 1 ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Active
            </span>
          ) : (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
              Inactive
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="container-fluid admin-settings-page">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order Status</h2>
      </div>

      <div className="mb-4 rounded-lg border border-admin-gray-200 bg-admin-gray-50 p-4 text-sm text-admin-gray-700">
        Order statuses are system-managed. You can view and search statuses here,
        but cannot create, edit, toggle, or delete them manually.
      </div>

      <div className="rounded-lg bg-white p-4 shadow-card">
        <div className="mb-4 max-w-md">
          <Input
            size="middle"
            placeholder="Search status..."
            value={keyword}
            onChange={(event) => {
              setPagination((prev) => ({ ...prev, current_page: 1 }));
              setKeyword(event.target.value);
            }}
          />
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load order statuses.{" "}
            {error?.data?.message || "Please try again."}
          </div>
        ) : null}

        <Table
          rowKey={(record) => Number(record.id)}
          columns={columns}
          dataSource={statuses}
          size="small"
          loading={loading}
          pagination={{
            current: Number(pagination.current_page || 1),
            pageSize,
            total: Number(pagination.total || 0),
            showSizeChanger: false,
            onChange: (page) =>
              setPagination((prev) => ({ ...prev, current_page: page })),
          }}
          scroll={{ x: 760 }}
        />
      </div>
    </div>
  );
};

export default OrderStatusSettings;
