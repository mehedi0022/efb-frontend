import api from './api';

export const orderService = {
    // Get all orders
    getOrders: async (params) => {
        const { status = 'all', ...rest } = params || {};
        const response = await api.get(`/admin/orders/${status}`, { params: rest });
        return response.data;
    },

    // Get order by ID
    getOrder: async (id) => {
        const response = await api.get(`/admin/orders/detail/${id}`);
        return response.data;
    },

    // Order statistics
    getStatistics: async () => {
        const response = await api.get('/admin/orders/statistics/all');
        return response.data;
    },

    // Bulk operations
    bulkAssign: async (orderIds, userId) => {
        const response = await api.post('/admin/orders/assign-user', {
            order_ids: orderIds,
            user_id: userId,
        });
        return response.data;
    },

    bulkChangeStatus: async (orderIds, statusId) => {
        const response = await api.post('/admin/orders/update-status', {
            order_ids: orderIds,
            status: statusId,
        });
        return response.data;
    },

    bulkDelete: async (orderIds) => {
        const response = await api.delete('/admin/orders/delete', { data: { order_ids: orderIds } });
        return response.data;
    },

    // Courier operations
    sendToSteadfast: async (orderIds) => {
        const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
        const response = await api.post('/admin/orders/send-dropshipping', {
            order_ids: ids,
        });
        return response.data;
    },

    sendToPathao: async (orderIds, pathaoData) => {
        const response = await api.post('/admin/orders/courier/pathao', {
            order_ids: orderIds,
            ...pathaoData,
        });
        return response.data;
    },

    // Get invoice
    getInvoice: async (invoiceId) => {
        const response = await api.get(`/admin/orders/invoice/${invoiceId}`);
        return response.data;
    },

    // Update order by invoice
    updateInvoiceOrder: async (invoiceId, payload) => {
        const response = await api.put(`/admin/orders/invoice/${invoiceId}`, payload);
        return response.data;
    },

    // Print orders
    printOrders: async (orderIds) => {
        const response = await api.post('/admin/orders/print', {
            order_ids: orderIds,
        });
        return response.data;
    },

    // Fraud check by phone
    fraudCheck: async (phone, options = {}) => {
        const response = await api.post('/admin/fraud-checker/check', {
            phone,
            ...options,
        });
        return response.data;
    },
};
