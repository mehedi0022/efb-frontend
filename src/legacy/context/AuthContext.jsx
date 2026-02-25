import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
    useGetUserQuery,
    useLoginMutation,
    useRegisterMutation,
    useLogoutMutation,
} from '../store/publicApi';

const AuthContext = createContext();

const normalizeErrors = (errors) => {
    if (!errors || typeof errors !== 'object') {
        return {};
    }

    return Object.entries(errors).reduce((acc, [key, value]) => {
        acc[key] = Array.isArray(value) ? value[0] : value;
        return acc;
    }, {});
};

export const AuthProvider = ({ children }) => {
    const isBrowser = typeof window !== 'undefined';
    const [token, setToken] = useState(() => (isBrowser ? localStorage.getItem('token') : null));
    const {
        data: user,
        isLoading,
        isFetching,
        error,
    } = useGetUserQuery(undefined, { skip: !token });
    const [loginMutation] = useLoginMutation();
    const [registerMutation] = useRegisterMutation();
    const [logoutMutation] = useLogoutMutation();

    useEffect(() => {
        if (!isBrowser) return;
        if (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            setToken(null);
        }
    }, [error, isBrowser]);

    const login = async (phone, password) => {
        try {
            const response = await loginMutation({ phone, password }).unwrap();
            const nextToken = response?.token;
            const refreshToken = response?.refresh_token;
            if (nextToken) {
                localStorage.setItem('token', nextToken);
                setToken(nextToken);
            }
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
            return { success: true };
        } catch (error) {
            const normalized = normalizeErrors(error?.data?.errors);
            return {
                success: false,
                errors: {
                    ...normalized,
                    message: error?.data?.message || 'Login failed',
                },
            };
        }
    };

    const register = async (data) => {
        try {
            const response = await registerMutation(data).unwrap();
            const nextToken = response?.token;
            const refreshToken = response?.refresh_token;
            if (nextToken) {
                localStorage.setItem('token', nextToken);
                setToken(nextToken);
            }
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
            return { success: true };
        } catch (error) {
            const normalized = normalizeErrors(error?.data?.errors);
            return {
                success: false,
                errors: {
                    ...normalized,
                    message: error?.data?.message || 'Registration failed',
                },
            };
        }
    };

    const logout = async () => {
        const refreshToken = isBrowser ? localStorage.getItem('refresh_token') : null;
        try {
            await logoutMutation({ refresh_token: refreshToken }).unwrap();
        } catch (error) {
            console.error('Logout error', error);
        } finally {
            if (isBrowser) {
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
            }
            setToken(null);
        }
    };

    const value = useMemo(() => ({
        user: user || null,
        login,
        register,
        logout,
        loading: isLoading || isFetching,
    }), [user, login, register, logout, isLoading, isFetching]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
