import React, { useEffect, useMemo, useState } from "react";
import { FiTrash2, FiEdit2 } from "react-icons/fi";
import { Select, Spin } from "antd";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Input from "../../components/common/Input";
import {
  useAdminActionMutation,
  useAdminFetchQuery,
  useLazyAdminFetchQuery,
} from "../../../store/adminApi";
import { resolveMediaUrl } from "../../../utils/media";
import { formatCurrency } from "../../utils/helpers";

// ─── Constants ────────────────────────────────────────────────────────────────

const BANGLADESH_DISTRICTS = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapai Nawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
];

const FB_CHARGE_MAP = { Dhaka: 70, default: 120 };
const OWN_CHARGE_MAP = { Dhaka: 70, default: 120 };

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateDiscountAmount = (subTotal, discountType, discountValue) => {
  const safeSubtotal = Math.max(0, Number(subTotal || 0));
  const safeValue = Math.max(0, Number(discountValue || 0));
  if (discountType === "percentage") {
    return Math.round((safeSubtotal * Math.min(100, safeValue)) / 100);
  }
  return Math.min(Math.round(safeValue), safeSubtotal);
};

// ─── Component ────────────────────────────────────────────────────────────────

const IncompleteOrderList = () => {
  // ── List state ──
  const [keyword, setKeyword] = useState("");
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const tagKey = "incomplete-orders";

  const { data: metaResponse } = useAdminFetchQuery({
    url: "/admin/incomplete-orders/meta",
    tags: ["incomplete-orders-meta"],
  });

  const queryArgs = useMemo(
    () => ({
      url: "/admin/incomplete-orders",
      params: { keyword, page: pagination.current_page, per_page: 20 },
      tags: [tagKey],
    }),
    [keyword, pagination.current_page],
  );

  const {
    data: response,
    isLoading,
    isFetching,
  } = useAdminFetchQuery(queryArgs);
  const [adminAction, { isLoading: isSaving }] = useAdminActionMutation();
  const [fetchDetails] = useLazyAdminFetchQuery();

  const orders = response?.data || [];
  const loading = isLoading || isFetching;

  // ── Shared lookups ──
  const { data: statusResponse } = useAdminFetchQuery({
    url: "/admin/order-statuses",
    tags: ["order-statuses"],
  });
  const { data: shippingChargeResponse } = useAdminFetchQuery({
    url: "/admin/shipping-charges",
    tags: ["shipping-charges"],
  });

  const statuses = (statusResponse?.data || []).filter(
    (s) => Number(s.status) === 1,
  );
  const shippingCharges = (shippingChargeResponse?.data || []).filter(
    (r) => Number(r.status) === 1,
  );

  // ── Product search ──
  const [productKeyword, setProductKeyword] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  const { data: productResponse, isFetching: isProductFetching } =
    useAdminFetchQuery({
      url: "/admin/products",
      params: { keyword: productKeyword, status: 1, per_page: 20 },
      tags: ["products"],
    });
  const products = productResponse?.data || [];

  // ── Modal state ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [apiError, setApiError] = useState("");
  const [errors, setErrors] = useState({});

  // ── Form state ──
  const [cartItems, setCartItems] = useState([]);
  const [productSource, setProductSource] = useState("fb");
  const [selectedCity, setSelectedCity] = useState("");

  const [formData, setFormData] = useState({
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
    shipping_area: "",
    shipping_charge_id: "",
    shipping_charge: 0,
    discount_type: "fixed",
    discount_value: 0,
    order_status: "",
    note: "",
    admin_note: "",
  });

  // ── Pagination sync ──
  useEffect(() => {
    if (response?.pagination) setPagination(response.pagination);
  }, [response]);

  // ── Totals ──
  const totals = useMemo(() => {
    const subTotal = cartItems.reduce(
      (s, i) => s + toNumber(i.price || i.sale_price, 0) * toNumber(i.qty, 1),
      0,
    );
    const shippingCharge = toNumber(formData.shipping_charge, 0);
    const discount = calculateDiscountAmount(
      subTotal,
      formData.discount_type,
      formData.discount_value,
    );
    const grandTotal = Math.max(0, subTotal + shippingCharge - discount);
    return { subTotal, shippingCharge, discount, grandTotal };
  }, [
    cartItems,
    formData.shipping_charge,
    formData.discount_type,
    formData.discount_value,
  ]);

  // ── Helpers ──
  const resolveIncompleteItemImage = (item) => {
    const source =
      item?.image ||
      item?.product_image ||
      item?.options?.image ||
      item?.product?.image?.image ||
      item?.product?.thumbnail ||
      null;
    const normalized = typeof source === "string" ? source.trim() : source;
    if (!normalized || normalized === "null" || normalized === "undefined")
      return "https://placehold.co/64x64?text=Item";
    return resolveMediaUrl(normalized, "https://placehold.co/64x64?text=Item");
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setApiError("");
  };

  // ── City / shipping ──
  const handleCityChange = (city) => {
    setSelectedCity(city);
    const chargeMap = productSource === "fb" ? FB_CHARGE_MAP : OWN_CHARGE_MAP;
    const charge = chargeMap[city] ?? chargeMap.default;
    const matched = shippingCharges.find(
      (r) =>
        String(r.name || "")
          .trim()
          .toLowerCase() === (city === "Dhaka" ? "dhaka" : "outside dhaka"),
    );
    setFormData((prev) => ({
      ...prev,
      shipping_area: city,
      shipping_charge_id: matched ? String(matched.id) : "",
      shipping_charge: charge,
    }));
    setErrors((prev) => ({ ...prev, shipping_area: "" }));
    setApiError("");
  };

  const handleSourceChange = (source) => {
    setProductSource(source);
    if (!selectedCity) return;
    const chargeMap = source === "fb" ? FB_CHARGE_MAP : OWN_CHARGE_MAP;
    setFormData((prev) => ({
      ...prev,
      shipping_charge: chargeMap[selectedCity] ?? chargeMap.default,
    }));
  };

  // ── Cart item qty ──
  const updateQty = async (rowId, qty) => {
    if (!selectedOrder) return;
    try {
      const res = await adminAction({
        url: "/admin/incomplete-orders/update-qty",
        method: "POST",
        body: { order_id: selectedOrder.id, row_id: rowId, qty },
        notifySuccess: false,
      }).unwrap();
      if (res.success) {
        setCartItems((prev) =>
          prev.map((item) => (item.row_id === rowId ? { ...item, qty } : item)),
        );
      }
    } catch (err) {
      console.error("Error updating qty:", err);
    }
  };

  // ── Product add ──
  const handleAddProduct = () => {
    const selected = products.find(
      (p) => String(p.id) === String(selectedProductId),
    );
    if (!selected) return;
    setCartItems((prev) => [
      ...prev,
      {
        row_id: `new-${Date.now()}`,
        name: selected.name || "",
        qty: 1,
        price: toNumber(
          selected.selling_price ??
            selected.new_price ??
            selected.old_price ??
            selected.purchase_price,
          0,
        ),
        purchase_price: toNumber(selected.purchase_price, 0),
        image: selected.image || "",
        product_size: "",
        product_color: "",
        isNew: true,
      },
    ]);
    setSelectedProductId("");
    setApiError("");
  };

  const handleItemChange = (rowId, field, value) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.row_id !== rowId) return item;
        if (field === "qty")
          return { ...item, qty: Math.max(1, toNumber(value, 1)) };
        if (field === "price")
          return { ...item, price: Math.max(0, toNumber(value, 0)) };
        return { ...item, [field]: value };
      }),
    );
  };

  const handleRemoveItem = (rowId) => {
    setCartItems((prev) => prev.filter((item) => item.row_id !== rowId));
  };

  // ── Validate ──
  const validate = () => {
    const next = {};
    if (!formData.shipping_name.trim())
      next.shipping_name = "Name is required.";
    if (!formData.shipping_phone.trim())
      next.shipping_phone = "Phone is required.";
    if (!formData.shipping_address.trim())
      next.shipping_address = "Address is required.";
    if (!formData.order_status) next.order_status = "Order status is required.";
    if (cartItems.length === 0) next.items = "At least one item is required.";
    if (toNumber(formData.discount_value, -1) < 0)
      next.discount_value = "Cannot be negative.";
    if (
      formData.discount_type === "percentage" &&
      toNumber(formData.discount_value, 0) > 100
    )
      next.discount_value = "Cannot exceed 100%.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Open modal ──
  const openCreateOrder = async (order) => {
    setApiError("");
    setErrors({});
    try {
      const res = await fetchDetails({
        url: `/admin/incomplete-orders/${order.id}`,
      }).unwrap();
      if (res.success) {
        const data = res.data;
        const items = res.cart_products || [];

        setSelectedOrder(data);
        setCartItems(items);
        setProductSource("fb");
        setSelectedCity("");

        setFormData({
          shipping_name: data.name || "",
          shipping_phone: data.phone || "",
          shipping_address: data.address || "",
          shipping_area: "",
          shipping_charge_id: "",
          shipping_charge: 0,
          discount_type: "fixed",
          discount_value: 0,
          order_status: "",
          note: "",
          admin_note: "",
        });

        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Error loading incomplete order:", err);
    }
  };

  // ── Submit ──
  const submitOrder = async (e) => {
    e.preventDefault();
    if (!validate() || !selectedOrder) return;

    try {
      // Step 1: Create the order using the same endpoint as normal order creation
      await adminAction({
        url: "/admin/orders",
        method: "POST",
        body: {
          shipping_name: formData.shipping_name.trim(),
          shipping_phone: formData.shipping_phone.trim(),
          shipping_address: formData.shipping_address.trim(),
          shipping_area: formData.shipping_area,
          shipping_charge_id: formData.shipping_charge_id
            ? Number(formData.shipping_charge_id)
            : null,
          shipping_charge: Math.max(0, Number(formData.shipping_charge) || 0),
          discount_type: formData.discount_type,
          discount_value: Math.max(0, Number(formData.discount_value) || 0),
          discount: totals.discount,
          order_status: Number(formData.order_status),
          note: formData.note || "",
          admin_note: formData.admin_note || "",
          items: cartItems.map((item) => ({
            product_id: item.product_id ? Number(item.product_id) : undefined,
            product_name: String(item.name || "").trim(),
            qty: Math.max(1, Number(item.qty) || 1),
            sale_price: Math.max(0, Number(item.price ?? item.sale_price) || 0),
            purchase_price: Math.max(0, Number(item.purchase_price) || 0),
            image: item.image || undefined,
          })),
        },
        invalidates: ["orders", "orders:all"],
      }).unwrap();

      // Step 2: Delete the incomplete order now that it's been converted
      await adminAction({
        url: `/admin/incomplete-orders/${selectedOrder.id}`,
        method: "DELETE",
        invalidates: [tagKey],
      }).unwrap();

      setIsModalOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error("Error creating order:", err);
      const fieldErrors = err?.data?.errors || {};
      const normalized = {};
      Object.entries(fieldErrors).forEach(([f, v]) => {
        normalized[f] = Array.isArray(v) ? v[0] : String(v);
      });
      setErrors((prev) => ({ ...prev, ...normalized }));
      setApiError(err?.data?.message || "Failed to create order.");
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    try {
      await adminAction({
        url: `/admin/incomplete-orders/${id}`,
        method: "DELETE",
        invalidates: [tagKey],
      }).unwrap();
    } catch (err) {
      console.error("Error deleting incomplete order:", err);
    }
  };

  // ── Table columns ──
  const columns = [
    {
      header: "SL",
      accessor: "id",
      width: "5%",
      render: (row, index) => index + 1,
    },
    { header: "Name", accessor: "name", width: "15%" },
    {
      header: "Products",
      accessor: "cart_products",
      width: "30%",
      render: (row) => (
        <div className="space-y-1">
          {(row.cart_products || []).length === 0 && (
            <span className="text-gray-500">No Products</span>
          )}
          {(row.cart_products || []).map((product, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <img
                src={resolveIncompleteItemImage(product)}
                alt={product.name || "Item"}
                className="w-8 h-8 object-cover rounded"
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/64x64?text=Item";
                }}
              />
              <span className="text-sm">
                {product.name || "Unnamed"} (Qty: {product.qty || 1})
              </span>
            </div>
          ))}
        </div>
      ),
    },
    { header: "Address", accessor: "address", width: "20%" },
    { header: "Phone", accessor: "phone", width: "10%" },
    {
      header: "Time",
      accessor: "created_at",
      width: "10%",
      render: (row) => new Date(row.created_at).toLocaleString(),
    },
    { header: "Status", accessor: "status", width: "10%" },
    {
      header: "Action",
      accessor: "actions",
      width: "10%",
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openCreateOrder(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            title="Create Order">
            <FiEdit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete">
            <FiTrash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Incomplete Orders</h2>
        <div className="w-72">
          <Input
            placeholder="Search..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-card">
        <DataTable columns={columns} data={orders} loading={loading} />
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() =>
                  setPagination({ ...pagination, current_page: page })
                }
                className={`px-4 py-2 rounded ${
                  page === pagination.current_page
                    ? "bg-admin-primary text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}>
                {page}
              </button>
            ),
          )}
        </div>
      )}

      {/* ── Create Order Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Order (From Incomplete)"
        size="xl">
        {apiError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <form onSubmit={submitOrder} className="space-y-6">
          {/* ── Cart Items Table ── */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3">
              <h4 className="text-base font-semibold text-gray-900">
                Order Items
              </h4>
            </div>

            {/* Product search — Ant Design Select with search */}
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Search &amp; Select Product
                </label>
                <Select
                  showSearch
                  allowClear
                  className="w-full"
                  size="large"
                  placeholder="Search products…"
                  filterOption={false}
                  notFoundContent={
                    isProductFetching ? (
                      <div className="flex items-center gap-2 px-2 py-1 text-sm text-gray-500">
                        <Spin size="small" /> Loading…
                      </div>
                    ) : (
                      <span className="px-2 py-1 text-sm text-gray-400">
                        No products found
                      </span>
                    )
                  }
                  onSearch={(val) => setProductKeyword(val)}
                  onFocus={() => setProductKeyword("")}
                  onChange={(val) => setSelectedProductId(val ?? "")}
                  value={selectedProductId || undefined}
                  optionLabelProp="label">
                  {products.map((p) => (
                    <Select.Option
                      key={p.id}
                      value={String(p.id)}
                      label={p.name}>
                      <div className="flex items-center gap-2 py-0.5">
                        {p.image && (
                          <img
                            src={resolveMediaUrl(
                              p.image,
                              "https://placehold.co/32x32?text=P",
                            )}
                            alt={p.name}
                            className="w-7 h-7 rounded object-cover flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm text-gray-800">
                            {p.name}
                          </span>
                          {(p.selling_price ?? p.new_price) != null && (
                            <span className="text-xs text-gray-400">
                              ৳
                              {toNumber(
                                p.selling_price ?? p.new_price,
                                0,
                              ).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="primary"
                rounded="md"
                onClick={handleAddProduct}
                disabled={!selectedProductId}>
                Add Product
              </Button>
            </div>

            {errors.items && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.items}
              </div>
            )}

            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-xs uppercase text-gray-600">
                      Image
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs uppercase text-gray-600">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs uppercase text-gray-600">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs uppercase text-gray-600">
                      Price
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs uppercase text-gray-600">
                      Total
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs uppercase text-gray-600">
                      Size / Color
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs uppercase text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {cartItems.map((item) => (
                    <tr key={item.row_id}>
                      <td className="px-3 py-2">
                        <img
                          src={resolveIncompleteItemImage(item)}
                          alt={item.name || "Item"}
                          className="w-10 h-10 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/64x64?text=Item";
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(
                              item.row_id,
                              "name",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="px-2 py-1 border rounded text-sm"
                            onClick={() =>
                              updateQty(
                                item.row_id,
                                Math.max(1, (item.qty || 1) - 1),
                              )
                            }>
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            className="w-14 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                            value={item.qty || 1}
                            onChange={(e) =>
                              handleItemChange(
                                item.row_id,
                                "qty",
                                e.target.value,
                              )
                            }
                          />
                          <button
                            type="button"
                            className="px-2 py-1 border rounded text-sm"
                            onClick={() =>
                              updateQty(item.row_id, (item.qty || 1) + 1)
                            }>
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                          value={item.price ?? item.sale_price ?? 0}
                          onChange={(e) =>
                            handleItemChange(
                              item.row_id,
                              "price",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 align-top">
                        {formatCurrency(
                          toNumber(item.qty, 1) *
                            toNumber(item.price ?? item.sale_price, 0),
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-sm text-gray-500">
                        <div>Size: {item.product_size || "N/A"}</div>
                        <div>Color: {item.product_color || "N/A"}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveItem(item.row_id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cartItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-gray-400">
                        No items. Add a product or custom item above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Shipping Information ── */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-4">
            <h4 className="text-base font-semibold text-gray-900">
              Shipping Information
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input
                  label="Name"
                  value={formData.shipping_name}
                  onChange={(e) =>
                    handleChange("shipping_name", e.target.value)
                  }
                  error={errors.shipping_name}
                  required
                />
              </div>
              <div>
                <Input
                  label="Phone"
                  value={formData.shipping_phone}
                  placeholder="01XXXXXXXXX"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                    handleChange("shipping_phone", raw);
                  }}
                  error={
                    formData.shipping_phone &&
                    !/^01[3-9]\d{8}$/.test(formData.shipping_phone)
                      ? "Enter a valid Bangladeshi number (e.g. 01XXXXXXXXX)"
                      : errors.shipping_phone
                  }
                  required
                />
              </div>
            </div>

            {/* Product Source Toggle */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Product Source
              </label>
              <div className="flex w-fit overflow-hidden rounded-lg border border-gray-300">
                <button
                  type="button"
                  onClick={() => handleSourceChange("fb")}
                  className={`px-5 py-2 text-sm font-medium transition-colors ${
                    productSource === "fb"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}>
                  FB Product
                </button>
                <button
                  type="button"
                  onClick={() => handleSourceChange("own")}
                  className={`border-l border-gray-300 px-5 py-2 text-sm font-medium transition-colors ${
                    productSource === "own"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}>
                  Own Product
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {productSource === "fb"
                  ? "Fixed rates: Inside Dhaka ৳70 · Outside Dhaka ৳120"
                  : "Fixed rates: Inside Dhaka ৳70 · Outside Dhaka ৳120 — editable"}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* City / District */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  City / District
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}>
                  <option value="">Select city</option>
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div>
                <Input
                  label="Address"
                  value={formData.shipping_address}
                  onChange={(e) =>
                    handleChange("shipping_address", e.target.value)
                  }
                  error={errors.shipping_address}
                  required
                />
              </div>

              {/* Delivery Charge */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Delivery Charge
                  {selectedCity && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      (
                      {selectedCity === "Dhaka"
                        ? "Inside Dhaka"
                        : "Outside Dhaka"}
                      )
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  readOnly={productSource === "fb"}
                  className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary ${
                    productSource === "fb"
                      ? "cursor-not-allowed bg-gray-50 text-gray-500"
                      : "bg-white"
                  }`}
                  value={formData.shipping_charge}
                  onChange={(e) => {
                    if (productSource === "own")
                      handleChange(
                        "shipping_charge",
                        Math.max(0, Number(e.target.value) || 0),
                      );
                  }}
                />
                {productSource === "fb" && (
                  <p className="mt-1 text-xs text-gray-400">
                    Fixed for FB products. Switch to Own Product to edit.
                  </p>
                )}
              </div>
            </div>

            {/* Discount + Order Status */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Discount Type
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                  value={formData.discount_type}
                  onChange={(e) =>
                    handleChange("discount_type", e.target.value)
                  }>
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>

              <Input
                label={
                  formData.discount_type === "percentage"
                    ? "Discount (%)"
                    : "Discount Amount"
                }
                type="number"
                min="0"
                step="1"
                value={formData.discount_value}
                onChange={(e) => handleChange("discount_value", e.target.value)}
                error={errors.discount_value}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Order Status
                </label>
                <select
                  className={`w-full rounded-md border px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary ${
                    errors.order_status ? "border-red-500" : "border-gray-300"
                  }`}
                  value={formData.order_status}
                  onChange={(e) => handleChange("order_status", e.target.value)}
                  required>
                  <option value="">Select status</option>
                  {statuses.slice(1).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.order_status && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.order_status}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Customer Note
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                  rows={3}
                  value={formData.note}
                  onChange={(e) => handleChange("note", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Admin Note
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                  rows={3}
                  value={formData.admin_note}
                  onChange={(e) => handleChange("admin_note", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Order Summary ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm text-gray-700">
            <h4 className="text-base font-semibold text-gray-900">
              Order Summary
            </h4>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{formatCurrency(totals.shippingCharge)}</span>
            </div>
            <div className="flex justify-between text-[#1f4ea3] font-medium">
              <span>
                Discount (
                {formData.discount_type === "percentage"
                  ? `${Number(formData.discount_value || 0)}%`
                  : "Fixed"}
                )
              </span>
              <span>− {formatCurrency(totals.discount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSaving}>
              Create Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IncompleteOrderList;
