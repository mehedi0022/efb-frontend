import React from 'react';
import { Link } from 'react-router-dom';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import {
    useDeleteCartItemMutation,
    useGetCartQuery,
    useUpdateCartItemMutation,
} from '../store/publicApi';

const Cart = () => {
    const { refreshCart } = useCart();
    const { data: cart, isLoading, isFetching } = useGetCartQuery();
    const [updateCartItem] = useUpdateCartItemMutation();
    const [deleteCartItem] = useDeleteCartItemMutation();

    const updateQuantity = async (itemId, newQty) => {
        if (newQty < 1) return;
        try {
            await updateCartItem({ id: itemId, quantity: newQty }).unwrap();
            refreshCart();
        } catch (error) {
            alert('Failed to update quantity');
        }
    };

    const removeItem = async (itemId) => {
        if (!confirm('Are you sure?')) return;
        try {
            await deleteCartItem(itemId).unwrap();
            refreshCart();
        } catch (error) {
            alert('Failed to remove item');
        }
    };

    if (isLoading || isFetching) return <div className="text-center p-10">Loading Cart...</div>;

    if (!cart || !cart.items || cart.items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-10 text-center">
                <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
                <Link to="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                    Continue Shopping
                </Link>
            </div>
        );
    }

    const subtotal = cart.items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Cart Items */}
                <div className="lg:w-2/3">
                    <div className="bg-white rounded shadow p-4">
                        {cart.items.map((item) => (
                            <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between border-b last:border-0 py-4 gap-4">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <img
                                        src={item.product_image || (item.product?.image?.image ? `/${item.product.image.image}` : 'https://placehold.co/100x100')}
                                        alt={item.product_name || item.product?.name}
                                        className="w-20 h-20 object-cover rounded"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-lg">{item.product_name || item.product?.name}</h3>
                                        <p className="text-gray-500 text-sm">
                                            {item.options?.size && `Size: ${item.options.size}`}
                                            {item.options?.color && `, Color: ${item.options.color}`}
                                        </p>
                                        <p className="text-blue-600 font-medium md:hidden">{item.price} BDT</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                                    <div className="hidden md:block font-medium">{item.price} BDT</div>

                                    <div className="flex items-center border rounded">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200"
                                        >
                                            <FaMinus size={12} />
                                        </button>
                                        <span className="px-3 py-1 min-w-[30px] text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200"
                                        >
                                            <FaPlus size={12} />
                                        </button>
                                    </div>

                                    <div className="md:hidden font-bold">
                                        {(parseFloat(item.price) * item.quantity).toFixed(2)} BDT
                                    </div>

                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="text-red-500 hover:text-red-700 p-2"
                                        title="Remove Item"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary */}
                <div className="lg:w-1/3">
                    <div className="bg-white rounded shadow p-6 sticky top-24">
                        <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium">{subtotal.toFixed(2)} BDT</span>
                        </div>
                        <div className="flex justify-between mb-4 border-b pb-4">
                            <span className="text-gray-600">Shipping</span>
                            <span className="text-sm text-gray-500">Calculated at checkout</span>
                        </div>
                        <div className="flex justify-between mb-6 text-xl font-bold">
                            <span>Total</span>
                            <span>{subtotal.toFixed(2)} BDT</span>
                        </div>

                        <Link
                            to="/checkout"
                            className="block w-full bg-blue-600 text-white text-center py-3 rounded font-semibold hover:bg-blue-700 transition"
                        >
                            Proceed to Checkout
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
