import React from 'react';
import { useParams } from 'react-router-dom';

const OrderPlaceholder = ({ title }) => {
    const { invoiceId } = useParams();
    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600">Invoice: {invoiceId}</p>
            <p className="text-gray-500 mt-4">This view will be fully ported from customer-web in the next iteration.</p>
        </div>
    );
};

export default OrderPlaceholder;
