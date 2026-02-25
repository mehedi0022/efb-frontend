import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useGetCartQuery } from '../store/publicApi';

const CartContext = createContext({
    cart: null,
    items: [],
    count: 0,
    subtotal: 0,
    loading: true,
    refreshCart: async () => {},
});

const sumItems = (items = []) => items.reduce((total, item) => total + Number(item.quantity || 0), 0);
const sumSubtotal = (items = []) => items.reduce((total, item) => {
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 0);
    return total + price * qty;
}, 0);

export const CartProvider = ({ children }) => {
    const { data: cart, isLoading, isFetching, refetch } = useGetCartQuery();
    const refreshCart = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const items = cart?.items || [];
    const count = sumItems(items);
    const subtotal = sumSubtotal(items);

    const value = useMemo(() => ({
        cart,
        items,
        count,
        subtotal,
        loading: isLoading || isFetching,
        refreshCart,
    }), [cart, items, count, subtotal, isLoading, isFetching, refreshCart]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);

export default CartContext;
