import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  FiAirplay,
  FiShoppingCart,
  FiClipboard,
  FiShield,
  FiDatabase,
  FiStar,
  FiUsers,
  FiSettings,
  FiSave,
  FiImage,
  FiPieChart,
  FiChevronDown,
  FiChevronRight,
  FiCircle,
  FiLink,
  FiCheckCircle,
} from "react-icons/fi";
import { getStoredAdminUser, hasPermission } from "../utils/rbac";
import { resolveMediaUrl } from "../../utils/media";
import { useAdminFetchQuery } from "../../store/adminApi";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Naxt Ecommerce";

const menuItems = [
  {
    title: "Dashboard",
    icon: FiAirplay,
    path: "/dashboard",
    prefixes: ["/dashboard"],
    permission: "dashboard.view",
  },
  {
    title: "Orders",
    icon: FiShoppingCart,
    key: "orders",
    prefixes: ["/orders"],
    children: [
      {
        title: "Create Order",
        path: "/orders/create",
        permission: "orders.edit",
      },
      {
        title: "All Orders",
        path: "/orders/all",
        permission: "orders.view",
      },
      {
        title: "New Order",
        path: "/orders/new-order",
        permission: "orders.view",
      },
      {
        title: "Complete Orders",
        path: "/orders/complete",
        permission: "orders.view",
      },
      {
        title: "No Response",
        path: "/orders/no-response",
        permission: "orders.view",
      },
      {
        title: "Hold Orders",
        path: "/orders/hold",
        permission: "orders.view",
      },
      {
        title: "Cancel Orders",
        path: "/orders/cancel",
        permission: "orders.view",
      },
      {
        title: "In Courier",
        path: "/orders/in-courier",
        permission: "orders.view",
      },
      {
        title: "Sent FB",
        path: "/orders/fb-sent",
        permission: "orders.view",
      },
    ],
  },
  {
    title: "Products",
    icon: FiDatabase,
    key: "products",
    prefixes: [
      "/products",
      "/categories",
      "/subcategories",
      "/brands",
      "/colors",
      "/sizes",
    ],
    children: [
      {
        title: "Product Manage",
        path: "/products",
        permission: "products.view",
      },
      {
        title: "Categories",
        path: "/categories",
        permission: "categories.view",
      },
      {
        title: "Subcategories",
        path: "/subcategories",
        permission: "subcategories.view",
      },
      { title: "Brands", path: "/brands", permission: "brands.view" },
      { title: "Colors", path: "/colors", permission: "colors.view" },
      { title: "Sizes", path: "/sizes", permission: "sizes.view" },
    ],
  },
  {
    title: "Reviews",
    icon: FiStar,
    key: "reviews",
    prefixes: ["/reviews"],
    children: [
      { title: "All Reviews", path: "/reviews", permission: "reviews.view" },
      {
        title: "Pending Reviews",
        path: "/reviews/pending",
        permission: "reviews.view",
      },
    ],
  },
  {
    title: "Incomplete",
    icon: FiClipboard,
    path: "/incomplete-orders",
    prefixes: ["/incomplete-orders"],
    permission: "incomplete-orders.view",
    badge: "New",
  },
  {
    title: "Fraud Checker",
    icon: FiCheckCircle,
    path: "/fraud-checker",
    prefixes: ["/fraud-checker"],
    permission: "fraud-checker.view",
    iconClass: "text-emerald-400",
    badge: "New",
  },
  {
    title: "IP Blocking",
    icon: FiShield,
    path: "/ip-blocks",
    prefixes: ["/ip-blocks"],
    permission: "ip-blocking.view",
    badge: "New",
  },
  {
    title: "Employees",
    icon: FiUsers,
    key: "employees",
    prefixes: ["/users", "/roles", "/permissions"],
    children: [
      { title: "Employee", path: "/users", permission: "users.view" },
      { title: "Roles", path: "/roles", permission: "roles.view" },
      {
        title: "Permissions",
        path: "/permissions",
        permission: "permissions.view",
      },
    ],
  },
  {
    title: "Site Setting",
    icon: FiSettings,
    key: "settings",
    prefixes: ["/settings"],
    children: [
      {
        title: "General Setting",
        path: "/settings",
        permission: "settings.view",
      },
      {
        title: "Contact",
        path: "/settings/contacts",
        permission: "settings.view",
      },
      {
        title: "Shipping Charge",
        path: "/settings/shipping-charges",
        permission: "settings.view",
      },
      {
        title: "Order Status",
        path: "/settings/order-statuses",
        permission: "settings.view",
      },
    ],
  },
  {
    title: "Configuration",
    icon: FiLink,
    key: "footer-config",
    prefixes: ["/footer-config"],
    children: [
      {
        title: "Useful & References",
        path: "/footer-config/links",
        permission: "settings.view",
      },
      {
        title: "Social Media Links",
        path: "/footer-config/social-links",
        permission: "settings.view",
      },
    ],
  },
  {
    title: "API Integration",
    icon: FiSave,
    key: "api",
    prefixes: ["/integrations"],
    children: [
      {
        title: "Courier API",
        path: "/integrations/courier",
        permission: "integrations.view",
      },
    ],
  },

  // // TEMP DISABLED: Pixel and GTM
  // {
  //   title: "Pixel and GTM",
  //   icon: FiSave,
  //   key: "pixel",
  //   prefixes: ["/pixels", "/tag-managers"],
  //   children: [
  //     { title: "Pixels Setting", path: "/pixels", permission: "pixels.view" },
  //     {
  //       title: "GTM Setting",
  //       path: "/tag-managers",
  //       permission: "tag-managers.view",
  //     },
  //   ],
  // },

  {
    title: "Banner & Ads",
    icon: FiImage,
    key: "banner",
    prefixes: ["/banners"],
    children: [
      { title: "Banners", path: "/banners", permission: "banners.view" },
    ],
  },
  {
    title: "Reports",
    icon: FiPieChart,
    key: "reports",
    prefixes: ["/reports"],
    children: [
      {
        title: "Order Reports",
        path: "/reports/orders",
        permission: "reports.view",
      },
    ],
  },
];

const matchesPath = (pathname, targetPath) =>
  pathname === targetPath || pathname.startsWith(`${targetPath}/`);

const Sidebar = ({ isOpen, onNavigate, user = null }) => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});
  const pathname = location.pathname;
  const { data: settingResponse } = useAdminFetchQuery({
    url: "/v1/settings",
    tags: ["admin-sidebar-setting"],
  });
  const authUser = user || getStoredAdminUser();
  const displayName = authUser?.name || "Admin User";
  const displayRole =
    authUser?.primary_role || authUser?.role || "Administrator";
  const avatarText = String(displayName).trim().charAt(0).toUpperCase() || "A";
  const avatarImage = resolveMediaUrl(authUser?.image, "");
  const sidebarLogo = resolveMediaUrl(settingResponse?.data?.logo, "");
  const sidebarBrandName = settingResponse?.data?.name || appName;

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isActive = (path) => matchesPath(pathname, path);
  const isMenuOpen = (key) => openMenus[key];

  const isMenuRouteActive = (item) => {
    if (item.path) return isActive(item.path);
    if (item.prefixes?.length) {
      return item.prefixes.some((prefix) => matchesPath(pathname, prefix));
    }
    return item.children?.some((child) => isActive(child.path));
  };

  const visibleMenuItems = useMemo(() => {
    return menuItems
      .map((item) => {
        if (item.children) {
          const visibleChildren = item.children.filter(
            (child) =>
              !child.permission || hasPermission(child.permission, authUser),
          );

          if (visibleChildren.length === 0) {
            return null;
          }

          return {
            ...item,
            children: visibleChildren,
          };
        }

        if (item.permission && !hasPermission(item.permission, authUser)) {
          return null;
        }

        return item;
      })
      .filter(Boolean);
  }, [authUser]);

  useEffect(() => {
    setOpenMenus((prev) => {
      const nextMenus = { ...prev };
      visibleMenuItems.forEach((item) => {
        if (item.key && isMenuRouteActive(item)) {
          nextMenus[item.key] = true;
        }
      });
      return nextMenus;
    });
  }, [pathname, visibleMenuItems]);

  return (
    <div
      className={clsx(
        "left-side-menu fixed inset-y-0 left-0 z-40 h-screen w-72 shrink-0 transform overflow-y-auto bg-admin-dark text-[13px] text-gray-300 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:w-64 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}>
      <div className="flex h-full min-h-0 flex-col" data-simplebar>
        {/* Logo Box */}
        <div className="h-16 flex items-center justify-center border-b border-gray-700 bg-admin-dark sticky top-0 z-10">
          <Link
            to={hasPermission("dashboard.view", authUser) ? "/dashboard" : "/"}
            onClick={onNavigate}
            className="flex items-center gap-2 px-4">
            {sidebarLogo ? (
              <img
                src={sidebarLogo}
                alt={sidebarBrandName}
                className="h-10 w-auto max-w-[220px] object-contain"
              />
            ) : (
              <h1 className="max-w-[220px] truncate text-center text-base font-bold tracking-wide text-white sm:text-lg">
                {sidebarBrandName}
              </h1>
            )}
          </Link>
        </div>

        {/* User Info (Optional, but kept for structure) */}
        <div className="border-b border-gray-700 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-admin-primary bg-admin-primary/20 text-[13px] font-bold text-white">
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                avatarText
              )}
            </div>
            <div>
              <p className="m-0 text-[13px] font-semibold text-white">
                {displayName}
              </p>
              <p className="m-0 text-[11px] text-gray-400">{displayRole}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Menu */}
        <div
          id="sidebar-menu"
          className="min-h-0 flex-1 overflow-y-auto py-2.5 pb-24">
          <ul className="space-y-1 px-3">
            {visibleMenuItems.map((item, index) => {
              const isMenuActive = isMenuRouteActive(item);
              const menuOpen = item.key ? isMenuOpen(item.key) : false;

              return (
                <li key={index}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() => toggleMenu(item.key)}
                        className={clsx(
                          "group flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 transition-all duration-200",
                          menuOpen || isMenuActive
                            ? "bg-white/5 text-white"
                            : "text-gray-400 hover:bg-white/5 hover:text-white",
                        )}>
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={clsx(
                              "h-5 w-5 transition-colors",
                              menuOpen || isMenuActive
                                ? "text-admin-primary"
                                : "text-gray-400 group-hover:text-white",
                            )}
                          />
                          <span className="flex items-center gap-2 text-[13px] font-medium">
                            {item.title}
                            {item.badge && (
                              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                                {item.badge}
                              </span>
                            )}
                          </span>
                        </div>
                        {menuOpen ? (
                          <FiChevronDown className="h-4 w-4" />
                        ) : (
                          <FiChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <motion.div
                        initial={false}
                        animate={{ height: menuOpen ? "auto" : 0 }}
                        className="overflow-hidden">
                        <ul className="space-y-1 py-1 pl-4">
                          {item.children.map((child, childIndex) => (
                            <li key={childIndex}>
                              <Link
                                to={child.path}
                                onClick={onNavigate}
                                className={clsx(
                                  "flex items-center justify-between gap-3 rounded-lg px-3.5 py-2 text-[13px] transition-all",
                                  isActive(child.path)
                                    ? "bg-gradient-to-r from-admin-primary to-green-400 text-white shadow-lg"
                                    : "text-gray-400 hover:pl-5 hover:text-white",
                                )}>
                                <span className="flex items-center gap-3">
                                  <FiCircle
                                    className={clsx(
                                      "h-2 w-2",
                                      isActive(child.path)
                                        ? "fill-white"
                                        : "fill-gray-400",
                                    )}
                                  />
                                  {child.title}
                                </span>
                                {child.badge && (
                                  <span
                                    className={clsx(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm",
                                      isActive(child.path)
                                        ? "bg-white/20 text-white"
                                        : "bg-gradient-to-r from-rose-500 to-red-500 text-white",
                                    )}>
                                    {child.badge}
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={onNavigate}
                      className={clsx(
                        "group flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-all",
                        isActive(item.path)
                          ? "bg-gradient-to-r from-admin-primary to-green-400 text-white shadow-lg"
                          : "text-gray-400 hover:bg-white/5 hover:text-white",
                      )}>
                      <item.icon
                        className={clsx(
                          "h-5 w-5",
                          isActive(item.path)
                            ? "text-white"
                            : item.iconClass
                              ? `${item.iconClass} group-hover:text-emerald-300`
                              : "text-gray-400 group-hover:text-white",
                        )}
                      />
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        {item.title}
                        {item.badge && (
                          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
