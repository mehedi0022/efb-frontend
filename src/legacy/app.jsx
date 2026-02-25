import './bootstrap';
import '../css/app.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { Provider } from 'react-redux';
import { store } from './store/store';

import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { SiteDataProvider } from './context/SiteDataContext';
import { CartProvider } from './context/CartContext';

ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <Provider store={store}>
            <AuthProvider>
                <SettingsProvider>
                    <SiteDataProvider>
                        <CartProvider>
                            <RouterProvider router={router} />
                        </CartProvider>
                    </SiteDataProvider>
                </SettingsProvider>
            </AuthProvider>
        </Provider>
    </React.StrictMode>
);
