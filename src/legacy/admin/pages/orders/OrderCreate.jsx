import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Select, Spin } from "antd";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import {
  useAdminActionMutation,
  useAdminFetchQuery,
} from "../../../store/adminApi";
import { formatCurrency } from "../../utils/helpers";
import { resolveMediaUrl } from "../../../utils/media";

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

const CHARGE_MAP = { Dhaka: 70, default: 120 };

const initialFormData = {
  shipping_name: "",
  shipping_phone: "",
  shipping_email: "",
  shipping_address: "",
  shipping_area: "",
  shipping_charge_id: "",
  shipping_charge: 0,
  discount_type: "fixed",
  discount_value: 0,
  order_status: "",
  note: "",
  admin_note: "",
  items: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const OrderCreate = () => {
  const navigate = useNavigate();
  const [adminAction, { isLoading: isSaving }] = useAdminActionMutation();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // product select
  const [productKeyword, setProductKeyword] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // ── Data fetches ──
  const { data: statusResponse } = useAdminFetchQuery({
    url: "/admin/order-statuses",
    tags: ["order-statuses"],
  });
  const { data: shippingChargeResponse } = useAdminFetchQuery({
    url: "/admin/shipping-charges",
    tags: ["shipping-charges"],
  });
  const { data: productResponse, isFetching: isProductFetching } =
    useAdminFetchQuery({
      url: "/admin/products",
      params: { keyword: productKeyword, status: 1, per_page: 20 },
      tags: ["products"],
    });

  const statuses = (statusResponse?.data || []).filter(
    (s) =>
      Number(s.status) === 1 &&
      !String(s.name || "")
        .toLowerCase()
        .includes("fb"),
  );
  const shippingCharges = (shippingChargeResponse?.data || []).filter(
    (r) => Number(r.status) === 1,
  );
  const products = productResponse?.data || [];

  // ── Totals ──
  const totals = useMemo(() => {
    const subTotal = (formData.items || []).reduce(
      (sum, item) => sum + toNumber(item.sale_price, 0) * toNumber(item.qty, 0),
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
    formData.items,
    formData.shipping_charge,
    formData.discount_type,
    formData.discount_value,
  ]);

  // ── Validation ──
  const validate = () => {
    const next = {};
    if (!formData.shipping_name.trim())
      next.shipping_name = "Name is required.";
    if (!formData.shipping_phone.trim())
      next.shipping_phone = "Phone is required.";
    if (!formData.shipping_address.trim())
      next.shipping_address = "Address is required.";
    if (!formData.order_status) next.order_status = "Order status is required.";
    if (toNumber(formData.discount_value, -1) < 0)
      next.discount_value = "Discount cannot be negative.";
    if (
      formData.discount_type === "percentage" &&
      toNumber(formData.discount_value, 0) > 100
    )
      next.discount_value = "Percentage cannot exceed 100.";
    if (!formData.items.length)
      next.items = "At least one order item is required.";

    formData.items.forEach((item, i) => {
      if (!String(item.product_name || "").trim())
        next[`items.${i}.product_name`] = "Product name is required.";
      if (toNumber(item.qty, 0) <= 0)
        next[`items.${i}.qty`] = "Quantity must be at least 1.";
      if (toNumber(item.sale_price, -1) < 0)
        next[`items.${i}.sale_price`] = "Price cannot be negative.";
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Generic field change ──
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setApiError("");
  };

  // ── City / shipping charge ──
  const handleCityChange = (city) => {
    setSelectedCity(city);
    const charge = CHARGE_MAP[city] ?? CHARGE_MAP.default;
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

  // ── Items ──
  const handleItemChange = (rowKey, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.row_key !== rowKey) return item;
        if (field === "qty")
          return { ...item, qty: Math.max(1, toNumber(value, 1)) };
        if (field === "sale_price" || field === "purchase_price")
          return { ...item, [field]: Math.max(0, toNumber(value, 0)) };
        return { ...item, [field]: value };
      }),
    }));
    setApiError("");
  };

  const handleRemoveItem = (rowKey) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.row_key !== rowKey),
    }));
    setApiError("");
  };

  const handleAddProduct = () => {
    const selected = products.find(
      (p) => String(p.id) === String(selectedProductId),
    );
    if (!selected) return;
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          row_key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          product_id: Number(selected.id),
          product_name: selected.name || "",
          qty: 1,
          sale_price: Math.max(
            0,
            toNumber(
              selected.selling_price ??
                selected.new_price ??
                selected.old_price ??
                selected.purchase_price,
              0,
            ),
          ),
          purchase_price: Math.max(0, toNumber(selected.purchase_price, 0)),
          image: selected?.image?.image || selected?.image || "",
        },
      ],
    }));
    setSelectedProductId("");
    setApiError("");
  };

  const handleAddCustomItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          row_key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          product_id: "",
          product_name: "",
          qty: 1,
          sale_price: 0,
          purchase_price: 0,
          image: "",
        },
      ],
    }));
    setApiError("");
  };

  // ── Submit ──
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      const response = await adminAction({
        url: "/admin/orders",
        method: "POST",
        body: {
          shipping_name: formData.shipping_name.trim(),
          shipping_phone: formData.shipping_phone.trim(),
          shipping_email: formData.shipping_email.trim(),
          shipping_address: formData.shipping_address.trim(),
          shipping_area: formData.shipping_area,
          shipping_charge_id: formData.shipping_charge_id
            ? Number(formData.shipping_charge_id)
            : null,
          shipping_charge: Math.max(0, Number(formData.shipping_charge) || 0),
          discount_type: formData.discount_type || "fixed",
          discount_value: Math.max(0, Number(formData.discount_value) || 0),
          discount: totals.discount,
          order_status: Number(formData.order_status),
          note: formData.note || "",
          admin_note: formData.admin_note || "",
          items: formData.items.map((item) => ({
            product_id: item.product_id ? Number(item.product_id) : null,
            product_name: String(item.product_name || "").trim(),
            qty: Math.max(1, Number(item.qty) || 1),
            sale_price: Math.max(0, Number(item.sale_price) || 0),
            purchase_price: Math.max(0, Number(item.purchase_price) || 0),
            image: item.image || null,
          })),
        },
        invalidates: ["orders", "orders:all"],
      }).unwrap();

      const invoiceId =
        response?.data?.invoice_id || response?.invoice_id || null;
      navigate(invoiceId ? `/orders/invoice/${invoiceId}` : "/orders/all");
    } catch (error) {
      const fieldErrors = error?.data?.errors || {};
      const normalized = {};
      Object.entries(fieldErrors).forEach(([f, v]) => {
        normalized[f] = Array.isArray(v) ? v[0] : String(v);
      });
      setErrors((prev) => ({ ...prev, ...normalized }));
      setApiError(error?.data?.message || "Failed to create order.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Orders</p>
          <h2 className="text-2xl font-bold text-gray-900">Create Order</h2>
        </div>
        <Link to="/orders/all">
          <Button variant="outline" rounded="md">
            Back to Orders
          </Button>
        </Link>
      </div>

      {apiError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* ── Left / Main column ── */}
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-card lg:col-span-2">
          {/* ── Customer Info ── */}
          <h3 className="text-lg font-semibold text-gray-900">
            Customer &amp; Shipping
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Name"
              value={formData.shipping_name}
              onChange={(e) => handleChange("shipping_name", e.target.value)}
              error={errors.shipping_name}
              required
            />
            <Input
              label="Phone"
              value={formData.shipping_phone}
              placeholder="01XXXXXXXXX"
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                handleChange("shipping_phone", raw);
              }}
              onKeyDown={(e) => {
                if (
                  !/^\d$/.test(e.key) &&
                  ![
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "Tab",
                  ].includes(e.key)
                )
                  e.preventDefault();
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

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Email (optional)"
              type="email"
              value={formData.shipping_email}
              onChange={(e) => handleChange("shipping_email", e.target.value)}
              error={errors.shipping_email}
            />
          </div>

          {/* ── Shipping Location ── */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* District */}
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                value={formData.shipping_charge}
                onChange={(e) =>
                  handleChange(
                    "shipping_charge",
                    Math.max(0, Number(e.target.value) || 0),
                  )
                }
              />
              <p className="mt-1 text-xs text-gray-400">
                Auto-filled by district — editable if needed
              </p>
            </div>
          </div>

          {/* ── Discount + Status ── */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Discount Type
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                value={formData.discount_type}
                onChange={(e) => handleChange("discount_type", e.target.value)}>
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
                {statuses.map((s) => (
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

          {/* ── Notes ── */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Customer Note
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                rows={3}
                value={formData.admin_note}
                onChange={(e) => handleChange("admin_note", e.target.value)}
              />
            </div>
          </div>

          {/* ── Order Items ── */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">
                Order Items
              </h4>
              <Button
                type="button"
                variant="outline"
                rounded="md"
                onClick={handleAddCustomItem}>
                Add Custom Item
              </Button>
            </div>

            {/* Ant Design product search */}
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
                              p?.image?.image || p?.image || "",
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
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Product
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Price
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Total
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {formData.items.map((item, index) => (
                    <tr key={item.row_key}>
                      <td className="px-3 py-2 align-top">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          value={item.product_name}
                          onChange={(e) =>
                            handleItemChange(
                              item.row_key,
                              "product_name",
                              e.target.value,
                            )
                          }
                        />
                        {errors[`items.${index}.product_name`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[`items.${index}.product_name`]}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          min="1"
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(
                              item.row_key,
                              "qty",
                              e.target.value,
                            )
                          }
                        />
                        {errors[`items.${index}.qty`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[`items.${index}.qty`]}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                          value={item.sale_price}
                          onChange={(e) =>
                            handleItemChange(
                              item.row_key,
                              "sale_price",
                              e.target.value,
                            )
                          }
                        />
                        {errors[`items.${index}.sale_price`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[`items.${index}.sale_price`]}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 align-top">
                        {formatCurrency(
                          toNumber(item.qty, 0) * toNumber(item.sale_price, 0),
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          onClick={() => handleRemoveItem(item.row_key)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-gray-400">
                        No items. Search and add a product above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              rounded="md"
              loading={isSaving}>
              Create Order
            </Button>
          </div>
        </div>

        {/* ── Right / Summary column ── */}
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>

          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{formatCurrency(totals.shippingCharge)}</span>
            </div>
            <div className="flex justify-between font-medium text-[#1f4ea3]">
              <span>
                Discount (
                {formData.discount_type === "percentage"
                  ? `${toNumber(formData.discount_value, 0)}%`
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

          {formData.items.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">
                Products
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                {formData.items.map((item) => (
                  <div
                    key={item.row_key}
                    className="flex justify-between gap-3">
                    <span className="line-clamp-2">
                      {item.product_name || "Unnamed item"}
                    </span>
                    <span className="whitespace-nowrap">×{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCity && (
            <div className="border-t pt-4 text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Delivery to</span>
                <span>{selectedCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Zone</span>
                <span>
                  {selectedCity === "Dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
                </span>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default OrderCreate;
