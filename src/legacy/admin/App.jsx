import React, { useEffect } from "react";
import {
  BrowserRouter,
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import OrderList from "./pages/orders/OrderList";
import OrderInvoice from "./pages/orders/OrderInvoice";
import OrderEdit from "./pages/orders/OrderEdit";
import OrderCreate from "./pages/orders/OrderCreate";
import CourierOrderList from "./pages/orders/CourierOrderList";
import OrderPlaceholder from "./pages/orders/OrderPlaceholder";
import FraudChecker from "./pages/orders/FraudChecker";
import Login from "./pages/auth/Login";
import ProductList from "./pages/products/ProductList";
import ProductCreate from "./pages/products/ProductCreate";
import ProductEdit from "./pages/products/ProductEdit";
import ProductView from "./pages/products/ProductView";
import CategoryList from "./pages/categories/CategoryList";
import SubcategoryList from "./pages/subcategories/SubcategoryList";
import BrandList from "./pages/brands/BrandList";
import ColorList from "./pages/colors/ColorList";
import SizeList from "./pages/sizes/SizeList";
import ReviewList from "./pages/reviews/ReviewList";
import PixelList from "./pages/pixels/PixelList";
import TagManagerList from "./pages/tagmanagers/TagManagerList";
import BannerList from "./pages/banners/BannerList";
import UserList from "./pages/users/UserList";
import RoleList from "./pages/roles/RoleList";
import PermissionList from "./pages/permissions/PermissionList";
import ProfileView from "./pages/account/ProfileView";
import AccountSettings from "./pages/account/AccountSettings";
import GeneralSettings from "./pages/settings/GeneralSettings";
import ContactSettings from "./pages/settings/ContactSettings";
import CreatePageSettings from "./pages/settings/CreatePageSettings";
import FooterSocialLinks from "./pages/settings/FooterSocialLinks";
import ShippingChargeSettings from "./pages/settings/ShippingChargeSettings";
import OrderStatusSettings from "./pages/settings/OrderStatusSettings";
import IpBlockSettings from "./pages/settings/IpBlockSettings";
import PaymentGatewaySettings from "./pages/integrations/PaymentGatewaySettings";
import SmsGatewaySettings from "./pages/integrations/SmsGatewaySettings";
import CourierApiSettings from "./pages/integrations/CourierApiSettings";
import IncompleteOrderList from "./pages/incomplete-orders/IncompleteOrderList";
import OrderReport from "./pages/reports/OrderReport";
import {
  getDefaultAdminRoute,
  getStoredAdminUser,
  hasPermission,
} from "./utils/rbac";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Naxt Ecommerce";
const loginTitle = process.env.NEXT_PUBLIC_LOGIN_PAGE_TITLE || appName;

const titleMatchers = [
  { pattern: /^\/dashboard$/, title: "Dashboard" },
  { pattern: /^\/orders(?:\/|$)/, title: "Orders" },
  { pattern: /^\/fraud-checker(?:\/|$)/, title: "Fraud Checker" },
  { pattern: /^\/ip-blocks(?:\/|$)/, title: "IP Blocking" },
  { pattern: /^\/products(?:\/|$)/, title: "Products" },
  { pattern: /^\/categories(?:\/|$)/, title: "Categories" },
  { pattern: /^\/subcategories(?:\/|$)/, title: "Subcategories" },
  { pattern: /^\/brands(?:\/|$)/, title: "Brands" },
  { pattern: /^\/colors(?:\/|$)/, title: "Colors" },
  { pattern: /^\/sizes(?:\/|$)/, title: "Sizes" },
  { pattern: /^\/reviews(?:\/|$)/, title: "Reviews" },
  { pattern: /^\/profile(?:\/|$)/, title: "Profile" },
  { pattern: /^\/account-settings(?:\/|$)/, title: "Account Settings" },
  { pattern: /^\/settings(?:\/|$)/, title: "Settings" },
  { pattern: /^\/footer-config(?:\/|$)/, title: "Footer Configuration" },
  { pattern: /^\/integrations(?:\/|$)/, title: "Integrations" },
  { pattern: /^\/pixels(?:\/|$)/, title: "Pixels" },
  { pattern: /^\/tag-managers(?:\/|$)/, title: "Tag Managers" },
  { pattern: /^\/banners(?:\/|$)/, title: "Banners" },
  { pattern: /^\/reports(?:\/|$)/, title: "Reports" },
  { pattern: /^\/incomplete-orders(?:\/|$)/, title: "Incomplete" },
  { pattern: /^\/customers(?:\/|$)/, title: "Customers" },
  { pattern: /^\/users(?:\/|$)/, title: "Employees" },
  { pattern: /^\/roles(?:\/|$)/, title: "Roles" },
  { pattern: /^\/permissions(?:\/|$)/, title: "Permissions" },
];

const toTitle = (value) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const getAdminPageTitle = (pathname = "") => {
  if (pathname === "/login") {
    return `${loginTitle} | Admin Login`;
  }

  const matched = titleMatchers.find(({ pattern }) => pattern.test(pathname));
  if (matched) {
    return `${matched.title} | ${appName} Admin`;
  }

  const fallbackSegment = pathname.split("/").filter(Boolean).pop();
  if (fallbackSegment) {
    return `${toTitle(fallbackSegment)} | ${appName} Admin`;
  }

  return `${appName} Admin`;
};

const AdminDocumentTitle = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = getAdminPageTitle(location.pathname);
  }, [location.pathname]);

  return null;
};

const DebugLocation = () => {
  const location = useLocation();
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300">404 - Not Found</h1>
        <p className="text-gray-600 mt-4">Path: {location.pathname}</p>
      </div>
    </div>
  );
};

const RequireAdminAuth = ({ children }) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const user = typeof window !== "undefined" ? getStoredAdminUser() : null;
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RedirectIfAuthenticated = ({ children }) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const user = typeof window !== "undefined" ? getStoredAdminUser() : null;
  if (token && user) {
    return <Navigate to={getDefaultAdminRoute()} replace />;
  }
  return children;
};

const AccessDenied = ({ permission }) => (
  <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center">
    <h2 className="text-xl font-semibold text-red-700">Access Restricted</h2>
    <p className="mt-2 text-sm text-red-600">
      You do not have permission to access this module.
    </p>
    {permission && (
      <p className="mt-2 text-xs text-red-500">
        Required permission: {permission}
      </p>
    )}
  </div>
);

const RequirePermission = ({ permission, children }) => {
  if (hasPermission(permission)) {
    return children;
  }
  return <AccessDenied permission={permission} />;
};

const App = () => {
  const isBrowser =
    typeof window !== "undefined" && typeof document !== "undefined";
  const Router = isBrowser ? BrowserRouter : MemoryRouter;
  const routerProps = isBrowser
    ? { basename: "/admin" }
    : { basename: "/admin", initialEntries: ["/admin/login"] };

  return (
    <Router {...routerProps}>
      <AdminDocumentTitle />
      <Routes>
        {/* Login Route (Public) */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <Login />
            </RedirectIfAuthenticated>
          }
        />

        {/* Admin Routes (Protected) */}
        <Route
          path="/"
          element={
            <RequireAdminAuth>
              <AdminLayout />
            </RequireAdminAuth>
          }>
          <Route
            index
            element={<Navigate to={getDefaultAdminRoute()} replace />}
          />
          <Route
            path="dashboard"
            element={
              <RequirePermission permission="dashboard.view">
                <Dashboard />
              </RequirePermission>
            }
          />
          {/* Orders */}
          <Route
            path="orders/invoice/:invoiceId"
            element={
              <RequirePermission permission="orders.view">
                <OrderInvoice />
              </RequirePermission>
            }
          />
          <Route
            path="orders/process/:invoiceId"
            element={
              <RequirePermission permission="orders.edit">
                <OrderPlaceholder title="Order Process" />
              </RequirePermission>
            }
          />
          <Route
            path="orders/edit/:invoiceId"
            element={
              <RequirePermission permission="orders.edit">
                <OrderEdit />
              </RequirePermission>
            }
          />
          <Route
            path="orders/create"
            element={
              <RequirePermission permission="orders.edit">
                <OrderCreate />
              </RequirePermission>
            }
          />
          <Route
            path="orders/in-courier"
            element={
              <RequirePermission permission="orders.view">
                <CourierOrderList />
              </RequirePermission>
            }
          />
          <Route
            path="orders/courier/list"
            element={<Navigate to="/orders/in-courier" replace />}
          />
          <Route
            path="orders/all"
            element={
              <RequirePermission permission="orders.view">
                <OrderList />
              </RequirePermission>
            }
          />
          <Route
            path="orders/new-order"
            element={
              <RequirePermission permission="orders.view">
                <OrderList />
              </RequirePermission>
            }
          />
          <Route
            path="orders/complete"
            element={
              <RequirePermission permission="orders.view">
                <OrderList />
              </RequirePermission>
            }
          />
          <Route
            path="orders/no-response"
            element={
              <RequirePermission permission="orders.view">
                <OrderList />
              </RequirePermission>
            }
          />
          <Route
            path="orders/hold"
            element={
              <RequirePermission permission="orders.view">
                <OrderList />
              </RequirePermission>
            }
          />
          <Route
            path="orders/cancel"
            element={
              <RequirePermission permission="orders.view">
                <OrderList />
              </RequirePermission>
            }
          />
          <Route
            path="orders/fb-sent"
            element={
              <RequirePermission permission="orders.view">
                <OrderList />
              </RequirePermission>
            }
          />
          <Route
            path="orders"
            element={<Navigate to="/orders/all" replace />}
          />
          <Route
            path="fraud-checker"
            element={
              <RequirePermission permission="fraud-checker.view">
                <FraudChecker />
              </RequirePermission>
            }
          />
          {/* Products Menu */}
          <Route
            path="products"
            element={
              <RequirePermission permission="products.view">
                <ProductList />
              </RequirePermission>
            }
          />
          <Route
            path="products/create"
            element={
              <RequirePermission permission="products.create">
                <ProductCreate />
              </RequirePermission>
            }
          />
          <Route
            path="products/edit/:id"
            element={
              <RequirePermission permission="products.edit">
                <ProductEdit />
              </RequirePermission>
            }
          />
          <Route
            path="products/:id"
            element={
              <RequirePermission permission="products.view">
                <ProductView />
              </RequirePermission>
            }
          />
          <Route
            path="categories"
            element={
              <RequirePermission permission="categories.view">
                <CategoryList />
              </RequirePermission>
            }
          />
          <Route
            path="subcategories"
            element={
              <RequirePermission permission="subcategories.view">
                <SubcategoryList />
              </RequirePermission>
            }
          />
          <Route
            path="brands"
            element={
              <RequirePermission permission="brands.view">
                <BrandList />
              </RequirePermission>
            }
          />
          <Route
            path="colors"
            element={
              <RequirePermission permission="colors.view">
                <ColorList />
              </RequirePermission>
            }
          />
          <Route
            path="sizes"
            element={
              <RequirePermission permission="sizes.view">
                <SizeList />
              </RequirePermission>
            }
          />
          {/* Reviews */}
          <Route
            path="reviews"
            element={
              <RequirePermission permission="reviews.view">
                <ReviewList />
              </RequirePermission>
            }
          />
          <Route
            path="reviews/:filter"
            element={
              <RequirePermission permission="reviews.view">
                <ReviewList />
              </RequirePermission>
            }
          />
          {/* Settings */}
          <Route path="profile" element={<ProfileView />} />
          <Route path="account-settings" element={<AccountSettings />} />
          <Route
            path="settings"
            element={
              <RequirePermission permission="settings.view">
                <GeneralSettings />
              </RequirePermission>
            }
          />
          <Route
            path="settings/contacts"
            element={
              <RequirePermission permission="settings.view">
                <ContactSettings />
              </RequirePermission>
            }
          />
          <Route
            path="settings/pages"
            element={<Navigate to="/footer-config/links" replace />}
          />
          <Route
            path="settings/shipping-charges"
            element={
              <RequirePermission permission="settings.view">
                <ShippingChargeSettings />
              </RequirePermission>
            }
          />
          <Route
            path="settings/order-statuses"
            element={
              <RequirePermission permission="settings.view">
                <OrderStatusSettings />
              </RequirePermission>
            }
          />
          <Route
            path="footer-config/links"
            element={
              <RequirePermission permission="settings.view">
                <CreatePageSettings />
              </RequirePermission>
            }
          />
          <Route
            path="footer-config/social-links"
            element={
              <RequirePermission permission="settings.view">
                <FooterSocialLinks />
              </RequirePermission>
            }
          />
          <Route
            path="ip-blocks"
            element={
              <RequirePermission permission="ip-blocking.view">
                <IpBlockSettings />
              </RequirePermission>
            }
          />
          <Route
            path="settings/ip-blocks"
            element={<Navigate to="/ip-blocks" replace />}
          />
          {/* API Integrations */}
          <Route
            path="integrations/payment"
            element={
              <RequirePermission permission="integrations.view">
                <PaymentGatewaySettings />
              </RequirePermission>
            }
          />
          <Route
            path="integrations/sms"
            element={
              <RequirePermission permission="integrations.view">
                <SmsGatewaySettings />
              </RequirePermission>
            }
          />
          <Route
            path="integrations/courier"
            element={
              <RequirePermission permission="integrations.view">
                <CourierApiSettings />
              </RequirePermission>
            }
          />
          {/* Pixels & Tag Managers */}

          <Route
            path="pixels"
            element={
              <RequirePermission permission="pixels.view">
                <PixelList />
              </RequirePermission>
            }
          />

          {/* <Route
            path="tag-managers"
            element={
              <RequirePermission permission="tag-managers.view">
                <TagManagerList />
              </RequirePermission>
            }
          /> */}

          {/* Banners */}
          <Route
            path="banner-categories"
            element={<Navigate to="/banners" replace />}
          />
          <Route
            path="banners"
            element={
              <RequirePermission permission="banners.view">
                <BannerList />
              </RequirePermission>
            }
          />
          {/* Incomplete Orders */}
          <Route
            path="incomplete-orders"
            element={
              <RequirePermission permission="incomplete-orders.view">
                <IncompleteOrderList />
              </RequirePermission>
            }
          />
          {/* Reports */}
          <Route
            path="reports/orders"
            element={
              <RequirePermission permission="reports.view">
                <OrderReport />
              </RequirePermission>
            }
          />
          {/* Employee RBAC modules */}
          <Route
            path="users"
            element={
              <RequirePermission permission="users.view">
                <UserList />
              </RequirePermission>
            }
          />
          <Route
            path="roles"
            element={
              <RequirePermission permission="roles.view">
                <RoleList />
              </RequirePermission>
            }
          />
          <Route
            path="permissions"
            element={
              <RequirePermission permission="permissions.view">
                <PermissionList />
              </RequirePermission>
            }
          />
        </Route>

        {/* Redirect root to admin dashboard */}
        <Route
          path="/"
          element={<Navigate to={getDefaultAdminRoute()} replace />}
        />

        {/* 404 Catch-all */}
        <Route path="*" element={<DebugLocation />} />
      </Routes>
    </Router>
  );
};

export default App;
