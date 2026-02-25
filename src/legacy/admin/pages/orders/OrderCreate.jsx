import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery } from '../../../store/adminApi';
import { formatCurrency } from '../../utils/helpers';

const initialFormData = {
    shipping_name: '',
    shipping_phone: '',
    shipping_email: '',
    shipping_address: '',
    shipping_area: '',
    shipping_charge_id: '',
    shipping_charge: 0,
    discount: 0,
    order_status: '',
    note: '',
    admin_note: '',
    items: [],
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const OrderCreate = () => {
    const navigate = useNavigate();
    const [adminAction, { isLoading: isSaving }] = useAdminActionMutation();
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [productKeyword, setProductKeyword] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');

    const { data: statusResponse } = useAdminFetchQuery({
        url: '/admin/order-statuses',
        tags: ['order-statuses'],
    });
    const { data: shippingChargeResponse } = useAdminFetchQuery({
        url: '/admin/shipping-charges',
        tags: ['shipping-charges'],
    });
    const { data: productResponse, isFetching: isProductFetching } = useAdminFetchQuery({
        url: '/admin/products',
        params: {
            keyword: productKeyword,
            status: 1,
            per_page: 20,
        },
        tags: ['products'],
    });

    const statuses = (statusResponse?.data || []).filter((status) => Number(status.status) === 1);
    const shippingCharges = (shippingChargeResponse?.data || []).filter((row) => Number(row.status) === 1);
    const products = productResponse?.data || [];

    const totals = useMemo(() => {
        const subTotal = (formData.items || []).reduce(
            (sum, item) => sum + (Number(item.sale_price || 0) * Number(item.qty || 0)),
            0
        );
        const shippingCharge = Number(formData.shipping_charge || 0);
        const discount = Number(formData.discount || 0);
        const grandTotal = Math.max(0, subTotal + shippingCharge - discount);

        return {
            subTotal,
            shippingCharge,
            discount,
            grandTotal,
        };
    }, [formData.items, formData.shipping_charge, formData.discount]);

    const validate = () => {
        const nextErrors = {};

        if (!formData.shipping_name.trim()) {
            nextErrors.shipping_name = 'Shipping name is required.';
        }
        if (!formData.shipping_phone.trim()) {
            nextErrors.shipping_phone = 'Shipping phone is required.';
        }
        if (!formData.shipping_address.trim()) {
            nextErrors.shipping_address = 'Shipping address is required.';
        }
        if (Number(formData.discount) < 0) {
            nextErrors.discount = 'Premium cannot be negative.';
        }
        if (!formData.order_status) {
            nextErrors.order_status = 'Order status is required.';
        }
        if (!Array.isArray(formData.items) || formData.items.length === 0) {
            nextErrors.items = 'At least one order item is required.';
        }

        (formData.items || []).forEach((item, index) => {
            if (!String(item.product_name || '').trim()) {
                nextErrors[`items.${index}.product_name`] = 'Product name is required.';
            }
            if (toNumber(item.qty, 0) <= 0) {
                nextErrors[`items.${index}.qty`] = 'Quantity must be at least 1.';
            }
            if (toNumber(item.sale_price, -1) < 0) {
                nextErrors[`items.${index}.sale_price`] = 'Price cannot be negative.';
            }
        });

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '' }));
        setApiError('');
    };

    const handleShippingChargeSelection = (shippingChargeId) => {
        const matched = shippingCharges.find((row) => String(row.id) === String(shippingChargeId));
        setFormData((prev) => ({
            ...prev,
            shipping_charge_id: shippingChargeId,
            shipping_charge: matched ? Math.max(0, Number(matched.amount || 0)) : 0,
            shipping_area: matched ? (matched.name || '') : '',
        }));
        setApiError('');
    };

    const handleItemChange = (rowKey, field, value) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item) => {
                if (item.row_key !== rowKey) return item;

                if (field === 'qty') {
                    return { ...item, qty: Math.max(1, toNumber(value, 1)) };
                }
                if (field === 'sale_price' || field === 'purchase_price') {
                    return { ...item, [field]: Math.max(0, toNumber(value, 0)) };
                }

                return { ...item, [field]: value };
            }),
        }));

        setApiError('');
    };

    const handleRemoveItem = (rowKey) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((item) => item.row_key !== rowKey),
        }));
        setApiError('');
    };

    const handleAddProduct = () => {
        const selected = products.find((product) => String(product.id) === String(selectedProductId));
        if (!selected) return;

        setFormData((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    row_key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    product_id: Number(selected.id),
                    product_name: selected.name || '',
                    qty: 1,
                    sale_price: Math.max(
                        0,
                        toNumber(
                            selected.selling_price ?? selected.new_price ?? selected.old_price ?? selected.purchase_price,
                            0
                        )
                    ),
                    purchase_price: Math.max(0, toNumber(selected.purchase_price, 0)),
                    image: selected?.image?.image || selected?.image || '',
                },
            ],
        }));

        setSelectedProductId('');
        setApiError('');
    };

    const handleAddCustomItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    row_key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    product_id: '',
                    product_name: '',
                    qty: 1,
                    sale_price: 0,
                    purchase_price: 0,
                    image: '',
                },
            ],
        }));
        setApiError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validate()) return;

        try {
            const selectedShippingCharge = shippingCharges.find(
                (row) => String(row.id) === String(formData.shipping_charge_id)
            );

            const response = await adminAction({
                url: '/admin/orders',
                method: 'POST',
                body: {
                    shipping_name: formData.shipping_name.trim(),
                    shipping_phone: formData.shipping_phone.trim(),
                    shipping_email: formData.shipping_email.trim(),
                    shipping_address: formData.shipping_address.trim(),
                    shipping_area: (
                        selectedShippingCharge?.name
                        || ''
                    ).trim(),
                    shipping_charge_id: formData.shipping_charge_id ? Number(formData.shipping_charge_id) : null,
                    shipping_charge: Math.max(0, Number(formData.shipping_charge) || 0),
                    discount: Math.max(0, Number(formData.discount) || 0),
                    order_status: Number(formData.order_status),
                    note: formData.note || '',
                    admin_note: formData.admin_note || '',
                    items: formData.items.map((item) => ({
                        product_id: item.product_id ? Number(item.product_id) : null,
                        product_name: String(item.product_name || '').trim(),
                        qty: Math.max(1, Number(item.qty) || 1),
                        sale_price: Math.max(0, Number(item.sale_price) || 0),
                        purchase_price: Math.max(0, Number(item.purchase_price) || 0),
                        image: item.image || null,
                    })),
                },
                invalidates: ['orders', 'orders:all'],
            }).unwrap();

            const invoiceId = response?.data?.invoice_id || response?.invoice_id || null;
            if (invoiceId) {
                navigate(`/orders/invoice/${invoiceId}`);
                return;
            }

            navigate('/orders/all');
        } catch (error) {
            const fieldErrors = error?.data?.errors || {};
            const normalizedErrors = {};
            Object.entries(fieldErrors).forEach(([field, value]) => {
                normalizedErrors[field] = Array.isArray(value) ? value[0] : String(value);
            });
            setErrors((prev) => ({ ...prev, ...normalizedErrors }));
            setApiError(error?.data?.message || 'Failed to create order.');
        }
    };

    return (
        <div className="container-fluid">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-gray-500">Orders</p>
                    <h2 className="text-2xl font-bold text-gray-900">Create Order</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/orders/all">
                        <Button variant="outline" rounded="md" icon={FiArrowLeft}>
                            Back to Orders
                        </Button>
                    </Link>
                </div>
            </div>

            {apiError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {apiError}
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-card lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900">Customer & Shipping Information</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Name"
                            value={formData.shipping_name}
                            onChange={(e) => handleChange('shipping_name', e.target.value)}
                            error={errors.shipping_name}
                            required
                        />
                        <Input
                            label="Phone"
                            value={formData.shipping_phone}
                            onChange={(e) => handleChange('shipping_phone', e.target.value)}
                            error={errors.shipping_phone}
                            required
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Email"
                            type="email"
                            value={formData.shipping_email}
                            onChange={(e) => handleChange('shipping_email', e.target.value)}
                            error={errors.shipping_email}
                        />
                    </div>

                    <Input
                        label="Address"
                        value={formData.shipping_address}
                        onChange={(e) => handleChange('shipping_address', e.target.value)}
                        error={errors.shipping_address}
                        required
                    />

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Delivery Charge Option</label>
                            <select
                                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                                value={formData.shipping_charge_id}
                                onChange={(e) => handleShippingChargeSelection(e.target.value)}
                            >
                                <option value="">Select delivery charge</option>
                                {shippingCharges.map((charge) => (
                                    <option key={charge.id} value={charge.id}>
                                        {charge.name} - {formatCurrency(Number(charge.amount || 0))}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="Premium"
                            type="number"
                            min="0"
                            step="1"
                            value={formData.discount}
                            onChange={(e) => handleChange('discount', e.target.value)}
                            error={errors.discount}
                        />
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Order Status</label>
                            <select
                                className={`w-full rounded-md border px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary ${
                                    errors.order_status ? 'border-red-500' : 'border-gray-300'
                                }`}
                                value={formData.order_status}
                                onChange={(e) => handleChange('order_status', e.target.value)}
                                required
                            >
                                <option value="">Select status</option>
                                {statuses.map((status) => (
                                    <option key={status.id} value={status.id}>
                                        {status.name}
                                    </option>
                                ))}
                            </select>
                            {errors.order_status ? (
                                <p className="mt-1 text-sm text-red-600">{errors.order_status}</p>
                            ) : null}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Customer Note</label>
                        <textarea
                            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                            rows={3}
                            value={formData.note}
                            onChange={(e) => handleChange('note', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Admin Note</label>
                        <textarea
                            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-admin-primary"
                            rows={3}
                            value={formData.admin_note}
                            onChange={(e) => handleChange('admin_note', e.target.value)}
                        />
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-base font-semibold text-gray-900">Order Items</h4>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" rounded="md" onClick={handleAddCustomItem}>
                                    <FiPlus className="h-4 w-4" />
                                    Add Custom Item
                                </Button>
                            </div>
                        </div>

                        <div className="mb-4 grid gap-2 md:grid-cols-3">
                            <Input
                                label="Search Product"
                                placeholder="Type product name..."
                                value={productKeyword}
                                onChange={(e) => setProductKeyword(e.target.value)}
                            />
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Product</label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                >
                                    <option value="">
                                        {isProductFetching ? 'Loading products...' : 'Select product'}
                                    </option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    variant="primary"
                                    rounded="md"
                                    onClick={handleAddProduct}
                                    disabled={!selectedProductId}
                                    className="w-full"
                                >
                                    <FiPlus className="h-4 w-4" />
                                    Add Product
                                </Button>
                            </div>
                        </div>

                        {errors.items ? (
                            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {errors.items}
                            </div>
                        ) : null}

                        <div className="overflow-x-auto rounded border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Product</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Qty</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Price</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {(formData.items || []).map((item, index) => (
                                        <tr key={item.row_key}>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                                    value={item.product_name}
                                                    onChange={(e) => handleItemChange(item.row_key, 'product_name', e.target.value)}
                                                />
                                                {errors[`items.${index}.product_name`] ? (
                                                    <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.product_name`]}</p>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(item.row_key, 'qty', e.target.value)}
                                                />
                                                {errors[`items.${index}.qty`] ? (
                                                    <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.qty`]}</p>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                                                    value={item.sale_price}
                                                    onChange={(e) => handleItemChange(item.row_key, 'sale_price', e.target.value)}
                                                />
                                                {errors[`items.${index}.sale_price`] ? (
                                                    <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.sale_price`]}</p>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2 text-sm font-medium text-gray-900 align-top">
                                                {formatCurrency(Number(item.qty || 0) * Number(item.sale_price || 0))}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <button
                                                    type="button"
                                                    className="rounded p-2 text-red-600 transition hover:bg-red-50"
                                                    onClick={() => handleRemoveItem(item.row_key)}
                                                >
                                                    <FiTrash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" variant="primary" rounded="md" icon={FiSave} loading={isSaving}>
                            Create Order
                        </Button>
                    </div>
                </div>

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
                        <div className="flex justify-between">
                            <span className="font-semibold text-[#1f4ea3]">Premium</span>
                            <span>{formatCurrency(totals.discount)}</span>
                        </div>
                        <div className="border-t pt-2 text-base font-semibold text-gray-900">
                            <div className="flex justify-between">
                                <span>Total</span>
                                <span>{formatCurrency(totals.grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="mb-2 text-sm font-semibold text-gray-900">Products</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                            {(formData.items || []).map((item) => (
                                <div key={item.row_key} className="flex justify-between gap-3">
                                    <span className="line-clamp-2">{item.product_name || 'Unnamed item'}</span>
                                    <span className="whitespace-nowrap">x{item.qty}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default OrderCreate;
