import { createBrowserRouter, createMemoryRouter } from 'react-router-dom';
import MainLayout from './Layouts/MainLayout';
import Home from './Pages/Home';
import Login from './Pages/Auth/Login';
import Register from './Pages/Auth/Register';
import Cart from './Pages/Cart';
import ProductList from './Pages/ProductList';
import ProductDetails from './Pages/ProductDetails';
import ExternalProductDetails from './Pages/ExternalProductDetails';
import ExternalCategoryListing from './Pages/ExternalCategoryListing';
import ExternalSearch from './Pages/ExternalSearch';
import Checkout from './Pages/Checkout';
import Contact from './Pages/Contact';
import Page from './Pages/Page';
import Account from './Pages/Account';
import OrderTrack from './Pages/OrderTrack';
import CategoryListing from './Pages/CategoryListing';
import OrderSuccess from './Pages/OrderSuccess';
import BlockedAccess from './Pages/BlockedAccess';

const routes = [
    {
        path: '/blocked',
        element: <BlockedAccess />,
    },
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                path: '/',
                element: <Home />,
            },
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/register',
                element: <Register />,
            },
            {
                path: '/cart',
                element: <Cart />,
            },
            {
                path: '/products',
                element: <ProductList />,
            },
            {
                path: '/products/:slug',
                element: <ProductDetails />,
            },
            {
                path: '/products/external/:slug',
                element: <ExternalProductDetails />,
            },
            {
                path: '/checkout',
                element: <Checkout />,
            },
            {
                path: '/contact',
                element: <Contact />,
            },
            {
                path: '/order-success',
                element: <OrderSuccess />,
            },
            {
                path: '/page/:slug',
                element: <Page />,
            },
            {
                path: '/account',
                element: <Account />,
            },
            {
                path: '/order-track',
                element: <OrderTrack />,
            },
            {
                path: '/search',
                element: <ExternalSearch />,
            },
            {
                path: '/category/external/:slug',
                element: <ExternalCategoryListing />,
            },
            {
                path: '/category/:slug',
                element: <CategoryListing type="category" />,
            },
            {
                path: '/subcategory/:slug',
                element: <CategoryListing type="subcategory" />,
            },
            {
                path: '/childcategory/:slug',
                element: <CategoryListing type="childcategory" />,
            },
        ],
    },
];

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const router = isBrowser
    ? createBrowserRouter(routes)
    : createMemoryRouter(routes, { initialEntries: ['/'] });

export default router;
