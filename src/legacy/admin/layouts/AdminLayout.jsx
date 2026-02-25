import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { getStoredAdminUser } from '../utils/rbac';
import { useAdminFetchQuery } from '../../store/adminApi';
import RouteTransitionLoader from '@/components/common/RouteTransitionLoader';

const AdminLayout = () => {
    const getDesktopMatch = () =>
        typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

    const [isDesktop, setIsDesktop] = useState(getDesktopMatch);
    const [sidebarOpen, setSidebarOpen] = useState(getDesktopMatch);
    const [notifications] = useState([]);
    const [adminUser, setAdminUser] = useState(() => getStoredAdminUser());
    const hasAuthToken = typeof window !== 'undefined' && Boolean(window.localStorage.getItem('auth_token'));

    const { data: meResponse } = useAdminFetchQuery(
        {
            url: '/admin/me',
            tags: ['me', 'users', 'roles', 'permissions'],
        },
        { skip: !hasAuthToken }
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 1024px)');

        const handleMediaQueryChange = (event) => {
            setIsDesktop(event.matches);
            setSidebarOpen(event.matches);
        };

        handleMediaQueryChange(mediaQuery);
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleMediaQueryChange);
            return () => mediaQuery.removeEventListener('change', handleMediaQueryChange);
        }

        mediaQuery.addListener(handleMediaQueryChange);
        return () => mediaQuery.removeListener(handleMediaQueryChange);
    }, []);

    useEffect(() => {
        if (!isDesktop && sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isDesktop, sidebarOpen]);

    useEffect(() => {
        const syncUser = () => setAdminUser(getStoredAdminUser());
        syncUser();

        window.addEventListener('storage', syncUser);
        return () => window.removeEventListener('storage', syncUser);
    }, []);

    useEffect(() => {
        if (!meResponse?.user || typeof window === 'undefined') return;

        window.localStorage.setItem('user', JSON.stringify(meResponse.user));
        setAdminUser(meResponse.user);
    }, [meResponse]);

    const toggleSidebar = () => setSidebarOpen((prev) => !prev);
    const closeMobileSidebar = () => {
        if (!isDesktop) {
            setSidebarOpen(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-admin-body font-sans text-gray-800">
            <RouteTransitionLoader variant="admin" />
            {/* Sidebar */}
            <Sidebar
                isOpen={isDesktop || sidebarOpen}
                onNavigate={closeMobileSidebar}
                user={adminUser}
            />

            {!isDesktop && sidebarOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    onClick={closeMobileSidebar}
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                />
            )}

            {/* Main Content */}
            <div className="flex h-screen flex-1 flex-col overflow-hidden">
                {/* Topbar */}
                <Topbar
                    toggleSidebar={toggleSidebar}
                    notifications={notifications}
                    showMenuButton={!isDesktop}
                    user={adminUser}
                />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 scroll-smooth">
                    <Outlet />
                </main>

                {/* Footer */}
                <footer className="mt-auto border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-center lg:justify-end">
                        <p className="text-sm text-gray-500 font-medium">
                            <span>{new Date().getFullYear()}</span> | Powered by{' '}
                            <a
                                href="https://freelancerbangladesh.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-admin-primary hover:underline hover:text-green-600 transition-colors"
                            >
                                Freelancer Bangladesh
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AdminLayout;
