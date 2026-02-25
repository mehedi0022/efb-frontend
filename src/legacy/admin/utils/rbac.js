const USER_STORAGE_KEY = 'user';

const safeJsonParse = (value) => {
    if (!value || typeof value !== 'string') return null;
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
};

export const getStoredAdminUser = () => {
    if (typeof window === 'undefined') return null;
    return safeJsonParse(window.localStorage.getItem(USER_STORAGE_KEY));
};

export const isSuperAdmin = (user = null) => {
    const authUser = user || getStoredAdminUser();
    if (!authUser) return false;

    const role = String(authUser.role || '').toLowerCase();
    const roles = Array.isArray(authUser.roles)
        ? authUser.roles.map((item) => String(item).toLowerCase())
        : [];

    return role === 'super-admin' || roles.includes('super-admin');
};

export const hasPermission = (permission, user = null) => {
    if (!permission) return true;

    const authUser = user || getStoredAdminUser();
    if (!authUser) return false;
    if (isSuperAdmin(authUser)) return true;

    const permissions = Array.isArray(authUser.permissions)
        ? authUser.permissions.map((item) => String(item))
        : [];

    return permissions.includes(permission);
};

export const hasAnyPermission = (permissions = [], user = null) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return true;
    return permissions.some((permission) => hasPermission(permission, user));
};

export const MODULE_VIEW_PERMISSIONS = [
    { path: '/dashboard', permission: 'dashboard.view' },
    { path: '/orders/all', permission: 'orders.view' },
    { path: '/fraud-checker', permission: 'fraud-checker.view' },
    { path: '/products', permission: 'products.view' },
    { path: '/categories', permission: 'categories.view' },
    { path: '/subcategories', permission: 'subcategories.view' },
    { path: '/brands', permission: 'brands.view' },
    { path: '/colors', permission: 'colors.view' },
    { path: '/sizes', permission: 'sizes.view' },
    { path: '/reviews', permission: 'reviews.view' },
    { path: '/users', permission: 'users.view' },
    { path: '/roles', permission: 'roles.view' },
    { path: '/permissions', permission: 'permissions.view' },
    { path: '/settings', permission: 'settings.view' },
    { path: '/ip-blocks', permission: 'ip-blocking.view' },
    { path: '/integrations/payment', permission: 'integrations.view' },
    { path: '/pixels', permission: 'pixels.view' },
    { path: '/tag-managers', permission: 'tag-managers.view' },
    { path: '/banner-categories', permission: 'banner-categories.view' },
    { path: '/banners', permission: 'banners.view' },
    { path: '/reports/orders', permission: 'reports.view' },
    { path: '/incomplete-orders', permission: 'incomplete-orders.view' },
];

export const getDefaultAdminRoute = (user = null) => {
    const authUser = user || getStoredAdminUser();
    if (!authUser) return '/dashboard';

    const allowed = MODULE_VIEW_PERMISSIONS.find(({ permission }) =>
        hasPermission(permission, authUser)
    );

    return allowed?.path || '/dashboard';
};
