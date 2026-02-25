import axios from 'axios';
import { buildApiUrl } from '@/config/env';

const api = axios.create({
    baseURL: buildApiUrl('/api/v1'),
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Cart ID handling
    let cartId = localStorage.getItem('cart_id');
    if (!cartId) {
        // Generate a random UUID if not exists (or wait for first response)
        // For now, we can rely on backend to return one if we send empty, 
        // OR generate on client. Generating on client is better to avoid session issues.
        // But UUID package needed? Or simple random string.
        // Let's assume we handle it in response.
    }
    if (cartId) {
        config.headers['X-Cart-ID'] = cartId;
    }
    return config;
});

api.interceptors.response.use((response) => {
    if (response.data.cart_id) {
        localStorage.setItem('cart_id', response.data.cart_id);
    }
    return response;
}, (error) => {
    return Promise.reject(error);
});

export default api;
