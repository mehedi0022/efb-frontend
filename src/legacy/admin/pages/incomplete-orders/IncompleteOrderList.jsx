import React, { useEffect, useMemo, useState } from 'react';
import { FiTrash2, FiEdit2 } from 'react-icons/fi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useAdminActionMutation, useAdminFetchQuery, useLazyAdminFetchQuery } from '../../../store/adminApi';
import { resolveMediaUrl } from '../../../utils/media';

const IncompleteOrderList = () => {
    const [keyword, setKeyword] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const tagKey = 'incomplete-orders';
    const { data: metaResponse } = useAdminFetchQuery({ url: '/admin/incomplete-orders/meta', tags: ['incomplete-orders-meta'] });
    const queryArgs = useMemo(() => ({
        url: '/admin/incomplete-orders',
        params: { keyword, page: pagination.current_page, per_page: 20 },
        tags: [tagKey],
    }), [keyword, pagination.current_page]);
    const { data: response, isLoading, isFetching } = useAdminFetchQuery(queryArgs);
    const [adminAction] = useAdminActionMutation();
    const [fetchDetails] = useLazyAdminFetchQuery();
    const orders = response?.data || [];
    const loading = isLoading || isFetching;
    const meta = {
        shipping_charges: metaResponse?.shipping_charges || [],
        districts: metaResponse?.districts || [],
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [totals, setTotals] = useState({ subtotal: 0, shipping: 0, discount: 0, grand_total: 0 });
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        district: '',
        area: '',
        note: '',
    });

    const resolveIncompleteItemImage = (item) => {
        const source = item?.image
            || item?.product_image
            || item?.options?.image
            || item?.product?.image?.image
            || item?.product?.thumbnail
            || null;

        const normalized = typeof source === 'string' ? source.trim() : source;
        if (!normalized || normalized === 'null' || normalized === 'undefined') {
            return 'https://placehold.co/64x64?text=Item';
        }

        return resolveMediaUrl(normalized, 'https://placehold.co/64x64?text=Item');
    };

    useEffect(() => {
        if (response?.pagination) {
            setPagination(response.pagination);
        }
    }, [response]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete?')) return;
        try {
            await adminAction({
                url: `/admin/incomplete-orders/${id}`,
                method: 'DELETE',
                invalidates: [tagKey],
            }).unwrap();
        } catch (error) {
            console.error('Error deleting incomplete order:', error);
        }
    };

    const openCreateOrder = async (order) => {
        try {
            const response = await fetchDetails({ url: `/admin/incomplete-orders/${order.id}` }).unwrap();
            if (response.success) {
                const data = response.data;
                const items = response.cart_products || [];
                setSelectedOrder(data);
                setCartItems(items);

                const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
                const shippingCharge = meta.shipping_charges.find((s) => s.id === data.shipping_charge_id);
                const shipping = shippingCharge ? Number(shippingCharge.amount) : 0;
                const discount = Number(data.discount || 0);
                const grandTotal = subtotal + shipping - discount;

                setTotals({ subtotal, shipping, discount, grand_total: grandTotal });

                setFormData({
                    name: data.name || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    district: data.district_id || '',
                    area: data.shipping_charge_id || '',
                    note: '',
                });

                setIsModalOpen(true);
            }
        } catch (error) {
            console.error('Error loading incomplete order:', error);
        }
    };

    const updateQty = async (rowId, qty) => {
        if (!selectedOrder) return;
        try {
            const response = await adminAction({
                url: '/admin/incomplete-orders/update-qty',
                method: 'POST',
                body: {
                    order_id: selectedOrder.id,
                    row_id: rowId,
                    qty,
                },
                notifySuccess: false,
            }).unwrap();
            if (response.success) {
                setTotals({
                    subtotal: response.subtotal,
                    shipping: response.shipping,
                    discount: response.discount,
                    grand_total: response.grand_total,
                });
                setCartItems((prev) =>
                    prev.map((item) => (item.row_id === rowId ? { ...item, qty } : item))
                );
            }
        } catch (error) {
            console.error('Error updating qty:', error);
        }
    };

    const updateShipping = async (shippingChargeId) => {
        if (!selectedOrder) return;
        try {
            const response = await adminAction({
                url: '/admin/incomplete-orders/update-shipping',
                method: 'POST',
                body: {
                    order_id: selectedOrder.id,
                    shipping_charge_id: shippingChargeId,
                },
                notifySuccess: false,
            }).unwrap();
            if (response.success) {
                setTotals({
                    subtotal: response.subtotal,
                    shipping: response.shipping,
                    discount: response.discount,
                    grand_total: response.grand_total,
                });
            }
        } catch (error) {
            console.error('Error updating shipping:', error);
        }
    };

    const submitOrder = async (e) => {
        e.preventDefault();
        if (!selectedOrder) return;
        try {
            await adminAction({
                url: `/admin/incomplete-orders/${selectedOrder.id}/create-order`,
                method: 'POST',
                body: formData,
                invalidates: [tagKey],
            }).unwrap();
            setIsModalOpen(false);
            setSelectedOrder(null);
        } catch (error) {
            console.error('Error creating order:', error);
            alert(error?.data?.message || 'Failed to create order');
        }
    };

    const columns = [
        { header: 'SL', accessor: 'id', width: '5%', render: (row, index) => index + 1 },
        { header: 'Name', accessor: 'name', width: '15%' },
        {
            header: 'Products',
            accessor: 'cart_products',
            width: '30%',
            render: (row) => (
                <div className="space-y-1">
                    {(row.cart_products || []).length === 0 && <span className="text-gray-500">No Products</span>}
                    {(row.cart_products || []).map((product, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <img
                                src={resolveIncompleteItemImage(product)}
                                alt={product.name || 'Item'}
                                className="w-8 h-8 object-cover rounded"
                                onError={(event) => {
                                    event.currentTarget.src = 'https://placehold.co/64x64?text=Item';
                                }}
                            />
                            <span className="text-sm">
                                {product.name || 'Unnamed'} (Qty: {product.qty || 1})
                            </span>
                        </div>
                    ))}
                </div>
            ),
        },
        { header: 'Address', accessor: 'address', width: '20%' },
        { header: 'Phone', accessor: 'phone', width: '10%' },
        {
            header: 'Time',
            accessor: 'created_at',
            width: '10%',
            render: (row) => new Date(row.created_at).toLocaleString(),
        },
        { header: 'Status', accessor: 'status', width: '10%' },
        {
            header: 'Action',
            accessor: 'actions',
            width: '10%',
            render: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => openCreateOrder(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Create Order"
                    >
                        <FiEdit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="container-fluid">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Incomplete</h2>
                <div className="w-72">
                    <Input
                        placeholder="Search..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-card">
                <DataTable columns={columns} data={orders} loading={loading} />
            </div>

            {pagination.last_page > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                    {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => setPagination({ ...pagination, current_page: page })}
                            className={`px-4 py-2 rounded ${page === pagination.current_page
                                ? 'bg-admin-primary text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create Order (From Incomplete)"
                size="xl"
            >
                <form onSubmit={submitOrder} className="space-y-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="px-3 py-2 text-left">Image</th>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Quantity</th>
                                    <th className="px-3 py-2 text-left">Size/Color</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cartItems.map((item) => (
                                    <tr key={item.row_id} className="border-b">
                                        <td className="px-3 py-2">
                                            <img
                                                src={resolveIncompleteItemImage(item)}
                                                alt={item.name || 'Item'}
                                                className="w-12 h-12 object-cover rounded"
                                                onError={(event) => {
                                                    event.currentTarget.src = 'https://placehold.co/64x64?text=Item';
                                                }}
                                            />
                                        </td>
                                        <td className="px-3 py-2">{item.name}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="px-2 py-1 border rounded"
                                                    onClick={() => {
                                                        const newQty = Math.max(1, (item.qty || 1) - 1);
                                                        updateQty(item.row_id, newQty);
                                                    }}
                                                >
                                                    -
                                                </button>
                                                <span>{item.qty || 1}</span>
                                                <button
                                                    type="button"
                                                    className="px-2 py-1 border rounded"
                                                    onClick={() => updateQty(item.row_id, (item.qty || 1) + 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div>Size: {item.product_size || 'N/A'}</div>
                                            <div>Color: {item.product_color || 'N/A'}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={formData.district}
                                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                required
                            >
                                <option value="">Select District</option>
                                {meta.districts.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Area</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                value={formData.area}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData({ ...formData, area: value });
                                    updateShipping(Number(value));
                                }}
                                required
                            >
                                <option value="">Select Area</option>
                                {meta.shipping_charges.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Note</label>
                            <textarea
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                rows="3"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>{totals.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Shipping</span>
                            <span>{totals.shipping}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Discount</span>
                            <span>{totals.discount}</span>
                        </div>
                        <div className="flex justify-between font-semibold mt-2">
                            <span>Total</span>
                            <span>{totals.grand_total}</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">Submit Order</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default IncompleteOrderList;
