import React, { useState } from 'react';

const OrderTrack = () => {
    const [invoiceId, setInvoiceId] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        alert('Order tracking will be available soon.');
    };

    return (
        <div className="container mx-auto px-4 py-10">
            <div className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-6">
                <h1 className="text-2xl font-semibold text-gray-900 mb-4">Track Your Order</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Enter Invoice ID"
                        value={invoiceId}
                        onChange={(e) => setInvoiceId(e.target.value)}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                        required
                    />
                    <button type="submit" className="w-full rounded bg-black px-4 py-2 text-white">
                        Track Order
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OrderTrack;
