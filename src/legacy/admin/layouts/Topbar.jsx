import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiMenu,
    FiBell,
    FiMaximize,
    FiGlobe,
    FiUser,
    FiSettings,
    FiLogOut,
} from 'react-icons/fi';
import { getStoredAdminUser } from '../utils/rbac';
import { useAdminActionMutation } from '../../store/adminApi';
import { resolveMediaUrl } from '../../utils/media';

const Topbar = ({ toggleSidebar, notifications = [], showMenuButton = true, user = null }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [adminAction] = useAdminActionMutation();

    const pendingNotifications = notifications.filter(n => !n.read);
    const authUser = user || getStoredAdminUser();
    const displayName = authUser?.name || 'Admin User';
    const displayRole = authUser?.primary_role || authUser?.role || 'Administrator';
    const avatarText = String(displayName).trim().charAt(0).toUpperCase() || 'A';
    const avatarImage = resolveMediaUrl(authUser?.image, '');

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleLogout = async () => {
        const refreshToken = localStorage.getItem('admin_refresh_token');

        try {
            await adminAction({
                url: '/admin/logout',
                method: 'POST',
                body: refreshToken ? { refresh_token: refreshToken } : undefined,
                notifySuccess: false,
            }).unwrap();
        } catch (error) {
            // Ignore API logout failures and clear local auth state regardless.
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('admin_refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/admin/login';
        }
    };

    return (
        <div className="navbar-custom bg-white shadow-sm z-10">
            <div className="container-fluid">
                <div className="flex items-center justify-between h-16">
                    {/* Left Section */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {showMenuButton && (
                            <button
                                onClick={toggleSidebar}
                                className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
                            >
                                <FiMenu className="h-6 w-6" />
                            </button>
                        )}

                        <a
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                            className="hidden items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-admin-primary/10 hover:text-admin-primary md:flex"
                        >
                            <FiGlobe className="h-4 w-4" />
                            <span>Visit Site</span>
                        </a>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Fullscreen Toggle */}
                        <button
                            onClick={toggleFullscreen}
                            className="hidden rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 lg:block"
                        >
                            <FiMaximize className="h-5 w-5" />
                        </button>

                        {/* Notifications Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
                            >
                                <FiBell className="h-5 w-5" />
                                {pendingNotifications.length > 0 && (
                                    <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-red-500 text-[10px] text-white">
                                        {pendingNotifications.length}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 z-50 mt-2 w-[calc(100vw-1.5rem)] max-w-sm origin-top-right overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl sm:w-80"
                                    >
                                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                            <h5 className="text-gray-800 font-bold">Notifications</h5>
                                            <span className="text-xs bg-admin-primary/10 text-admin-primary px-2 py-0.5 rounded-full font-medium">
                                                {pendingNotifications.length} New
                                            </span>
                                        </div>

                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="py-8 text-center text-gray-400 text-sm">
                                                    No new notifications
                                                </div>
                                            ) : (
                                                notifications.slice(0, 5).map((notification, index) => (
                                                    <Link
                                                        key={index}
                                                        to={`/orders/${notification.order_id}`}
                                                        className="block p-4 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                                                        onClick={() => setShowNotifications(false)}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                                                <FiBell className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-gray-800 font-medium text-sm truncate">
                                                                    {notification.customer?.name || 'New Order'}
                                                                </p>
                                                                <p className="text-gray-500 text-xs mt-0.5 truncate">
                                                                    {notification.message || `New order received #${notification.invoice_id}`}
                                                                </p>
                                                                <p className="text-gray-400 text-[10px] mt-1">2 mins ago</p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))
                                            )}
                                        </div>

                                        <Link
                                            to="/orders/new-order"
                                            className="block p-3 text-center text-admin-primary font-medium hover:bg-gray-50 border-t border-gray-100 transition-colors text-sm"
                                            onClick={() => setShowNotifications(false)}
                                        >
                                            View all Notifications
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* User Menu Dropdown */}
                        <div className="relative ml-1 border-l border-gray-200 pl-3 sm:ml-2 sm:pl-4">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-50 sm:gap-3"
                            >
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold text-gray-800 leading-tight m-0">{displayName}</p>
                                    <p className="text-xs text-gray-500 m-0">{displayRole}</p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-admin-primary text-sm font-bold text-white shadow-sm">
                                    {avatarImage ? (
                                        <img src={avatarImage} alt={displayName} className="h-full w-full object-cover" />
                                    ) : (
                                        avatarText
                                    )}
                                </div>
                            </button>

                            <AnimatePresence>
                                {showUserMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 z-50 mt-2 w-48 origin-top-right overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl"
                                    >
                                        <div className="py-1">
                                            <Link
                                                to="/profile"
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-admin-primary transition-colors"
                                            >
                                                <FiUser className="w-4 h-4" />
                                                <span>Profile</span>
                                            </Link>
                                            <Link
                                                to="/account-settings"
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-admin-primary transition-colors"
                                            >
                                                <FiSettings className="w-4 h-4" />
                                                <span>Settings</span>
                                            </Link>
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <FiLogOut className="w-4 h-4" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Topbar;
