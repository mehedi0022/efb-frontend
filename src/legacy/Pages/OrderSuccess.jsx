import React from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiHome, FiShoppingBag } from 'react-icons/fi';

const OrderSuccess = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="flex justify-center mb-6">
                    <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
                        <FiCheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Successful!</h2>
                <p className="text-gray-600 mb-6 font-semibold">
                    Your order has been placed successfully. Our representative will contact you shortly.
                </p>

                <div className="space-y-3">
                    <Link
                        to="/order-track"
                        className="block w-full bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <FiShoppingBag />
                        Track Order
                    </Link>

                    <Link
                        to="/"
                        className="block w-full bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <FiHome />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
