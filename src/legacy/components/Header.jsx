import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaChevronLeft,
  FaChevronRight,
  FaShoppingCart,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useSiteData } from "../context/SiteDataContext";
import { useCart } from "../context/CartContext";
import {
  useGetExternalMenuCategoriesQuery,
  useGetExternalSearchQuery,
  useDeleteCartItemMutation,
} from "../store/publicApi";
import { resolveMediaUrl } from "../utils/media";
import {
  resolveExternalProductSlug,
  toExternalProductPath,
} from "../utils/externalProduct";

const Header = () => {
  const { user } = useAuth();
  const { setting, loading: isSettingsLoading } = useSettings();
  const { menuCategories } = useSiteData();
  const { items, count, subtotal, refreshCart } = useCart();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [isCategoryPinned, setIsCategoryPinned] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [searchOpenTarget, setSearchOpenTarget] = useState(null);
  const [menuPage, setMenuPage] = useState(1);
  const [shouldFetchMenu, setShouldFetchMenu] = useState(false);
  const [expandedDrawerCategories, setExpandedDrawerCategories] = useState({});
  const [expandedDrawerSubcategories, setExpandedDrawerSubcategories] =
    useState({});
  const [activeDesktopCategoryId, setActiveDesktopCategoryId] = useState(null);
  const [removingCartItemId, setRemovingCartItemId] = useState(null);

  const categoryZoneRef = useRef(null);
  const categoryPanelRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const desktopMenuCloseTimeoutRef = useRef(null);
  const categoryHoverTimeoutRef = useRef(null);

  const [deleteCartItem] = useDeleteCartItemMutation();

  useEffect(() => {
    const handleOpenMenu = () => {
      setMobileMenuOpen(false);
      setMobileDrawerOpen(true);
    };
    window.addEventListener("open-mobile-menu", handleOpenMenu);
    return () => window.removeEventListener("open-mobile-menu", handleOpenMenu);
  }, []);

  // Lock body scroll when any mobile overlay is open
  useEffect(() => {
    if (mobileDrawerOpen || mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen, mobileMenuOpen]);

  const logoSrc = resolveMediaUrl(setting?.logo);
  const siteName = setting?.name || "Smart Shop";
  const headerBgColor = setting?.header_bg_color || "#ffffff";
  const marqueeHtml = setting?.description || "";
  const externalImageBase =
    process.env.NEXT_PUBLIC_EXTERNAL_IMAGE_BASE ||
    "https://freelancerbangladesh.com/";

  const cartItems = useMemo(() => items || [], [items]);
  const cartBadgeCount = count > 99 ? "99+" : count;

  const resolveCartImage = (item) => {
    const featureImage =
      typeof item?.product?.feature_image === "string"
        ? item.product.feature_image
        : item?.product?.feature_image?.image;
    const image =
      item?.product_image ||
      item?.options?.product_image ||
      item?.product?.image?.image ||
      featureImage ||
      item?.product?.thumbnail ||
      item?.product?.image;
    return resolveMediaUrl(image, "https://placehold.co/64x64?text=Product");
  };

  const handleRemovePopupCartItem = async (itemId, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!itemId || removingCartItemId !== null) return;
    setRemovingCartItemId(itemId);
    try {
      await deleteCartItem(itemId).unwrap();
      await refreshCart();
    } catch (error) {
      console.error("Failed to remove item from cart popup", error);
    } finally {
      setRemovingCartItemId(null);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const keyword = searchKeyword.trim();
    if (!keyword) return;
    setSearchOpenTarget(null);
    navigate(`/search?keyword=${encodeURIComponent(keyword)}&page=1`);
  };

  const toggleDrawerCategory = (id) => {
    setExpandedDrawerCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDrawerSubcategory = (id) => {
    setExpandedDrawerSubcategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearDesktopMenuCloseTimeout = () => {
    if (desktopMenuCloseTimeoutRef.current) {
      window.clearTimeout(desktopMenuCloseTimeoutRef.current);
      desktopMenuCloseTimeoutRef.current = null;
    }
  };

  const openDesktopSubmenu = (categoryId) => {
    clearDesktopMenuCloseTimeout();
    setActiveDesktopCategoryId(categoryId);
  };

  const closeDesktopSubmenuWithDelay = () => {
    clearDesktopMenuCloseTimeout();
    desktopMenuCloseTimeoutRef.current = window.setTimeout(() => {
      setActiveDesktopCategoryId(null);
      desktopMenuCloseTimeoutRef.current = null;
    }, 180);
  };

  const handleCategoryZoneEnter = () => {
    if (categoryHoverTimeoutRef.current) {
      clearTimeout(categoryHoverTimeoutRef.current);
      categoryHoverTimeoutRef.current = null;
    }
    if (!shouldFetchMenu) {
      setShouldFetchMenu(true);
      setMenuPage(1);
    }
    setShowCategoryPanel(true);
  };

  const handleCategoryZoneLeave = () => {
    if (!isCategoryPinned) {
      categoryHoverTimeoutRef.current = setTimeout(() => {
        setShowCategoryPanel(false);
      }, 150);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const {
    data: externalSearchResponse,
    isLoading: isExternalSearchLoading,
    isFetching: isExternalSearchFetching,
    error: externalSearchError,
  } = useGetExternalSearchQuery(
    { keyword: debouncedKeyword, page: 1, limit: 8 },
    { skip: debouncedKeyword.length < 2 },
  );

  const searchResults = useMemo(
    () =>
      Array.isArray(externalSearchResponse?.data)
        ? externalSearchResponse.data
        : [],
    [externalSearchResponse],
  );

  const isSearchLoading = isExternalSearchLoading || isExternalSearchFetching;

  const resolveExternalProductImage = (item) => {
    const info = item?.product_info || item || {};
    const img = info?.thumbnail || info?.image || item?.image || "";
    if (!img) return "https://placehold.co/64x64?text=Product";
    if (/^https?:\/\//i.test(img)) return img;
    return `${externalImageBase}${String(img).replace(/^\/+/, "")}`;
  };

  const renderSearchDropdown = (target) => {
    if (searchOpenTarget !== target) return null;
    const canSearch = debouncedKeyword.length >= 2;
    return (
      <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-2xl">
        {!canSearch ? (
          <div className="px-4 py-3 text-sm text-gray-500">
            Type at least 2 characters to search.
          </div>
        ) : isSearchLoading ? (
          <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
        ) : externalSearchError ? (
          <div className="px-4 py-3 text-sm text-red-600">
            Failed to load products.
          </div>
        ) : searchResults.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500">
            No products found.
          </div>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto">
            {searchResults.map((item, index) => {
              const info = item?.product_info || item || {};
              const name = info?.name || "Unknown product";
              const slug = resolveExternalProductSlug(item);
              const price = item?.price ?? info?.price ?? info?.new_price ?? "";
              const prevPrice =
                item?.previous_price ??
                info?.previous_price ??
                info?.old_price ??
                "";
              return (
                <li
                  key={item?.id || item?.product_id || slug || index}
                  className="border-b border-gray-100 last:border-b-0">
                  <Link
                    to={toExternalProductPath(slug)}
                    onClick={() => setSearchOpenTarget(null)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <img
                      src={resolveExternalProductImage(item)}
                      alt={name}
                      className="h-12 w-12 rounded-md object-cover border border-gray-100"
                      loading="lazy"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2">
                        {name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="font-semibold text-rose-500">
                          ৳{price}
                        </span>
                        {prevPrice ? (
                          <span className="text-gray-400 line-through">
                            ৳{prevPrice}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  const {
    data: externalMenuResponse,
    isLoading: isExternalMenuLoading,
    isFetching: isExternalMenuFetching,
    error: externalMenuError,
  } = useGetExternalMenuCategoriesQuery(
    { page: menuPage, limit: 100 },
    { skip: !shouldFetchMenu },
  );

  const externalMenuCategories = useMemo(
    () =>
      Array.isArray(externalMenuResponse?.data?.data)
        ? externalMenuResponse.data.data
        : Array.isArray(externalMenuResponse?.data)
          ? externalMenuResponse.data
          : Array.isArray(externalMenuResponse)
            ? externalMenuResponse
            : [],
    [externalMenuResponse],
  );

  const externalMenuMeta = {
    page: externalMenuResponse?.meta?.page || menuPage,
    last_page: externalMenuResponse?.meta?.last_page || 1,
  };

  const isExternalMenuLoadingState =
    isExternalMenuLoading || isExternalMenuFetching;

  const pickCategoryText = (...candidates) => {
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      const value = String(candidate).trim();
      if (value) return value;
    }
    return "";
  };

  const normalizeCategorySlug = (value) => {
    if (!value) return "";
    let normalized = String(value).trim();
    if (!normalized) return "";
    try {
      normalized = decodeURIComponent(normalized);
    } catch {
      // keep original
    }
    normalized =
      normalized
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .pop() || "";
    normalized = normalized
      .replace(/[_\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return normalized;
  };

  const slugFromUrl = (value) => {
    if (!value) return "";
    const text = String(value).trim();
    if (!text) return "";
    const withoutQuery = text.split("?")[0].split("#")[0];
    const segment =
      withoutQuery
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .pop() || "";
    return normalizeCategorySlug(segment);
  };

  const resolveExternalCategorySlug = (category) => {
    const directSlug = pickCategoryText(
      category?.category_slug,
      category?.slug,
      category?.category?.slug,
      category?.category_info?.slug,
      category?.cat_slug,
      slugFromUrl(category?.category_url),
      slugFromUrl(category?.category_link),
      slugFromUrl(category?.url),
      slugFromUrl(category?.link),
    );
    const normalizedDirectSlug = normalizeCategorySlug(directSlug);
    if (normalizedDirectSlug) return normalizedDirectSlug;
    const fallbackName = pickCategoryText(
      category?.category_name,
      category?.name,
      category?.categoryName,
      category?.title,
      category?.category?.name,
      category?.category?.category_name,
      category?.category_info?.name,
      category?.category_info?.category_name,
    );
    return normalizeCategorySlug(fallbackName);
  };

  const resolveExternalCategoryName = (category) => {
    if (category?.name) return category.name;
    if (category?.category_name) return category.category_name;
    const slug = resolveExternalCategorySlug(category);
    return slug ? slug.replace(/-/g, " ") : "Category";
  };

  const sortByName = (items, getName) =>
    [...items].sort((a, b) =>
      getName(a).localeCompare(getName(b), undefined, { sensitivity: "base" }),
    );

  const sortedExternalMenuCategories = useMemo(
    () =>
      sortByName(externalMenuCategories, (category) =>
        resolveExternalCategoryName(category),
      ),
    [externalMenuCategories],
  );

  const sortedDesktopMenuCategories = useMemo(
    () =>
      sortByName(
        Array.isArray(menuCategories) ? menuCategories : [],
        (category) => category?.name || "",
      ),
    [menuCategories],
  );

  const mobileDrawerCategories = sortedDesktopMenuCategories;

  const toggleCategoryPanel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowCategoryPanel((prev) => {
      if (!prev) {
        setIsCategoryPinned(true);
        if (!shouldFetchMenu) {
          setShouldFetchMenu(true);
          setMenuPage(1);
        }
        return true;
      }
      setIsCategoryPinned(false);
      return false;
    });
  };

  const handleMenuPage = (nextPage) => {
    if (nextPage < 1 || nextPage > externalMenuMeta.last_page) return;
    if (nextPage === externalMenuMeta.page) return;
    setMenuPage(nextPage);
  };

  const openMobileDrawer = () => {
    setMobileMenuOpen(false);
    setMobileDrawerOpen(true);
  };

  const openMobileCategoryModal = () => {
    setMobileDrawerOpen(false);
    setShouldFetchMenu(true);
    setMenuPage(1);
    setTimeout(() => {
      setMobileMenuOpen(true);
    }, 0);
  };

  useEffect(() => {
    setShouldFetchMenu(true);
    setMenuPage(1);
  }, []);

  // ── RESPONSIVE MULTI-COLUMN MEGA MENU ─────────────────────────────────────
  const renderExternalCategoryPanelContent = (onItemClick) => (
    <>
      {/* Pagination header */}
      {externalMenuMeta.last_page > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 sticky top-0 bg-white z-10">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            All Categories
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleMenuPage(externalMenuMeta.page - 1)}
              disabled={
                externalMenuMeta.page <= 1 || isExternalMenuLoadingState
              }
              className="theme-btn-skip inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 transition-colors"
              aria-label="Previous">
              <FaChevronLeft size={10} />
            </button>
            <span className="text-xs text-gray-400 font-medium tabular-nums">
              {externalMenuMeta.page}/{externalMenuMeta.last_page}
            </span>
            <button
              type="button"
              onClick={() => handleMenuPage(externalMenuMeta.page + 1)}
              disabled={
                externalMenuMeta.page >= externalMenuMeta.last_page ||
                isExternalMenuLoadingState
              }
              className="theme-btn-skip inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 transition-colors"
              aria-label="Next">
              <FaChevronRight size={10} />
            </button>
          </div>
        </div>
      )}

      {isExternalMenuLoadingState ? (
        <div className="flex items-center justify-center py-10 text-sm text-gray-400">
          <span className="animate-pulse">Loading categories…</span>
        </div>
      ) : externalMenuError ? (
        <div className="py-8 text-center text-sm text-red-500">
          Failed to load categories.
        </div>
      ) : sortedExternalMenuCategories.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No categories found.
        </div>
      ) : (
        /* 2 cols on mobile, 3 on sm, 4 on desktop */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {sortedExternalMenuCategories.map((category, index) => {
            const slug = resolveExternalCategorySlug(category);
            const name = resolveExternalCategoryName(category);
            const categoryPath = slug
              ? `/category/external/${encodeURIComponent(slug)}`
              : "#";
            const children = sortByName(
              Array.isArray(category.childern) ? category.childern : [],
              (child) => resolveExternalCategoryName(child),
            );

            const isOdd = index % 2 === 0;
            const colBg = isOdd ? "#f5f7ff" : "#fffdf9";

            return (
              <div
                key={category.id || slug || index}
                style={{
                  backgroundColor: colBg,
                  borderRight: "1px solid #eef0f4",
                  borderBottom: "1px solid #eef0f4",
                }}
                className="flex flex-col p-3">
                {/* Category heading */}
                <Link
                  to={categoryPath}
                  onClick={() => {
                    if (slug && typeof onItemClick === "function")
                      onItemClick();
                  }}
                  className={`group mb-1.5 ${!slug ? "pointer-events-none" : ""}`}>
                  <span
                    className={`block text-[13px] font-bold capitalize leading-snug transition-all duration-300 ${
                      slug
                        ? "text-gray-700 group-hover:text-blue-600 group-hover:translate-x-0.5"
                        : "text-gray-400"
                    }`}>
                    {name}
                  </span>
                </Link>

                {/* Children list */}
                {children.length > 0 ? (
                  <ul className="flex flex-col gap-0.5 mt-1">
                    {children.map((child, idx) => {
                      const childSlug = resolveExternalCategorySlug(child);
                      const childName = resolveExternalCategoryName(child);
                      const parentCategoryId = category?.id || category?.category_id;
                      const childPath = childSlug
                        ? `/subcategory/external/${encodeURIComponent(childSlug)}${parentCategoryId ? `?category_id=${encodeURIComponent(String(parentCategoryId))}` : ""}`
                        : "#";
                      return (
                        <li key={child.id || childSlug || idx}>
                          <Link
                            to={childPath}
                            onClick={() => {
                              if (
                                childPath !== "#" &&
                                typeof onItemClick === "function"
                              )
                                onItemClick();
                            }}
                            className={`group/child flex items-center gap-1 text-[12px] capitalize transition-all duration-150 ${
                              childPath !== "#"
                                ? "text-gray-500 hover:text-blue-600"
                                : "text-gray-300 pointer-events-none"
                            }`}>
                            <span className="line-clamp-1 group-hover/child:translate-x-0.5 transition-transform duration-150">
                              {childName}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
  // ── END MEGA MENU ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!showCategoryPanel) return undefined;
    const handleOutsideClick = (event) => {
      if (
        categoryZoneRef.current &&
        !categoryZoneRef.current.contains(event.target)
      ) {
        setShowCategoryPanel(false);
        setIsCategoryPinned(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showCategoryPanel]);

  useEffect(() => {
    if (!searchOpenTarget) return undefined;
    const handleOutsideSearchClick = (event) => {
      if (
        mobileSearchRef.current &&
        mobileSearchRef.current.contains(event.target)
      )
        return;
      if (
        desktopSearchRef.current &&
        desktopSearchRef.current.contains(event.target)
      )
        return;
      setSearchOpenTarget(null);
    };
    document.addEventListener("mousedown", handleOutsideSearchClick);
    return () =>
      document.removeEventListener("mousedown", handleOutsideSearchClick);
  }, [searchOpenTarget]);

  useEffect(() => () => clearDesktopMenuCloseTimeout(), []);

  useEffect(
    () => () => {
      if (categoryHoverTimeoutRef.current)
        clearTimeout(categoryHoverTimeoutRef.current);
    },
    [],
  );

  return (
    <>
      <header
        className="sticky top-0 z-50 bg-white shadow-md backdrop-blur"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {/* ── Mobile marquee ── */}
        {marqueeHtml ? (
          <div className="bg-white py-1 md:hidden border-b border-gray-100">
            <marquee
              className="mx-2 text-black text-xs"
              behavior="scroll"
              direction="left"
              scrollamount="5"
              dangerouslySetInnerHTML={{ __html: marqueeHtml }}
            />
          </div>
        ) : null}

        {/* ── Mobile top bar ── */}
        <div className="md:hidden bg-white">
          {/* Row 1: Hamburger | Logo | Cart */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
            <button
              type="button"
              className="theme-btn-skip inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700"
              onClick={openMobileDrawer}
              aria-label="Open menu">
              <FaBars size={18} />
            </button>

            <Link to="/" className="flex items-center">
              {isSettingsLoading ? (
                <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-gray-200" />
              ) : logoSrc ? (
                <img
                  src={logoSrc}
                  alt={siteName}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <span className="font-semibold text-base">{siteName}</span>
              )}
            </Link>

            <Link
              to="/cart"
              className="relative inline-flex h-9 w-9 items-center justify-center text-gray-700"
              aria-label={`Cart (${count})`}>
              <FaShoppingCart size={18} />
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {cartBadgeCount}
              </span>
            </Link>
          </div>

          {/* Row 2: Search bar */}
          <div className="px-3 py-2 border-b border-gray-100">
            <form
              ref={mobileSearchRef}
              onSubmit={handleSearch}
              className="relative flex h-10 w-full items-center rounded-full border border-gray-200 bg-gray-50 px-3">
              <input
                type="text"
                placeholder="Search products..."
                value={searchKeyword}
                onFocus={() => setSearchOpenTarget("mobile")}
                onChange={(event) => {
                  setSearchKeyword(event.target.value);
                  setSearchOpenTarget("mobile");
                }}
                className="h-full flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="ml-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Search
              </button>
              {renderSearchDropdown("mobile")}
            </form>
          </div>

          {/* Row 3: Category button */}
          <div className="px-3 py-2">
            <button
              type="button"
              onClick={openMobileCategoryModal}
              className="theme-btn-skip flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-blue-700">
              <FaBars size={14} />
              <span>All Categories</span>
            </button>
          </div>
        </div>

        {/* ── Desktop marquee ── */}
        <div
          className="hidden md:block"
          style={{ backgroundColor: headerBgColor }}>
          <div className="container mx-auto px-4 py-2">
            {marqueeHtml ? (
              <marquee
                behavior="scroll"
                direction="left"
                scrollamount="5"
                className="font-semibold text-black"
                dangerouslySetInnerHTML={{ __html: marqueeHtml }}
              />
            ) : null}
          </div>
        </div>

        {/* ── Desktop logo / search / cart ── */}
        <div
          className="hidden md:block border-b"
          style={{ backgroundColor: headerBgColor }}>
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              {isSettingsLoading ? (
                <span className="inline-block h-12 w-36 animate-pulse rounded-md bg-gray-200" />
              ) : logoSrc ? (
                <img
                  src={logoSrc}
                  alt={siteName}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <span className="text-xl font-semibold">{siteName}</span>
              )}
            </Link>

            <div className="flex-1">
              <form
                ref={desktopSearchRef}
                onSubmit={handleSearch}
                className="relative mx-auto flex h-[50px] w-full max-w-[520px] items-center gap-2 rounded-full border border-gray-200 bg-white px-4 shadow-sm focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-black/10">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchKeyword}
                  onFocus={() => setSearchOpenTarget("desktop")}
                  onChange={(event) => {
                    setSearchKeyword(event.target.value);
                    setSearchOpenTarget("desktop");
                  }}
                  className="h-full flex-1 bg-transparent px-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="rounded-full bg-gray-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-black">
                  Search
                </button>
                {renderSearchDropdown("desktop")}
              </form>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              {/* Cart hover popup */}
              <div className="relative group">
                <Link
                  to="/cart"
                  className="flex items-center gap-2 text-gray-800">
                  <span className="font-semibold">Cart</span>
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-xs font-semibold text-white">
                    {count}
                  </span>
                </Link>
                <div className="absolute right-0 top-full z-50 hidden w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg group-hover:block">
                  {cartItems.length === 0 ? (
                    <p className="text-sm text-gray-500">Your cart is empty.</p>
                  ) : (
                    <>
                      <ul className="space-y-3">
                        {cartItems.map((item, index) => {
                          const itemId = item?.id || item?.cart_item_id || null;
                          const isRemovingItem =
                            itemId !== null &&
                            String(removingCartItemId) === String(itemId);
                          return (
                            <li
                              key={itemId || `cart-item-${index}`}
                              className="flex items-start gap-3">
                              <img
                                src={resolveCartImage(item)}
                                alt={
                                  item.product?.name ||
                                  item.product_name ||
                                  "Product"
                                }
                                className="h-12 w-12 rounded object-cover"
                              />
                              <div className="min-w-0 flex-1 text-sm">
                                <p className="font-semibold text-gray-800 line-clamp-1">
                                  {item.product?.name ||
                                    item.product_name ||
                                    "Product"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Qty: {item.quantity}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-gray-800">
                                    ৳{item.price}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(event) =>
                                      handleRemovePopupCartItem(itemId, event)
                                    }
                                    disabled={
                                      itemId === null ||
                                      removingCartItemId !== null
                                    }
                                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                                    {isRemovingItem ? "Removing..." : "Remove"}
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-3 border-t pt-3 text-sm font-semibold">
                        Total: ৳{subtotal}
                      </div>
                      <Link
                        to="/checkout"
                        className="theme-btn-info mt-3 block rounded border px-4 py-2 text-center text-sm font-semibold">
                        Order Now
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Account */}
              <Link
                to={user ? "/account" : "/login"}
                className="flex items-center gap-2 text-gray-800">
                <FaUser />
                <span className="font-semibold">Account</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Desktop nav bar ── */}
        <div className="hidden md:block border-b bg-white">
          <div className="container mx-auto py-3 px-4 flex items-center gap-6">
            <div
              ref={categoryZoneRef}
              className="relative"
              onMouseEnter={handleCategoryZoneEnter}
              onMouseLeave={handleCategoryZoneLeave}>
              <button
                type="button"
                onClick={toggleCategoryPanel}
                className={`theme-btn-skip flex items-center gap-2 rounded px-4 py-2 text-sm font-bold uppercase transition-colors duration-150 ${
                  showCategoryPanel
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-blue-600 hover:text-white"
                }`}>
                <FaBars />
                Category
              </button>

              {showCategoryPanel && (
                <div
                  ref={categoryPanelRef}
                  className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden"
                  style={{
                    width: "min(960px, 90vw)",
                    maxHeight: "520px",
                    overflowY: "auto",
                  }}>
                  {renderExternalCategoryPanelContent(() => {
                    setShowCategoryPanel(false);
                    setIsCategoryPinned(false);
                  })}
                </div>
              )}
            </div>

            <ul className="hidden lg:flex flex-1 items-center gap-4 m-0">
              {sortedDesktopMenuCategories.map((category) => (
                <li
                  key={category.id}
                  className="relative"
                  onMouseEnter={() => openDesktopSubmenu(category.id)}
                  onMouseLeave={closeDesktopSubmenuWithDelay}>
                  <Link
                    to={`/category/${category.slug}`}
                    className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors duration-150"
                    onFocus={() => openDesktopSubmenu(category.id)}>
                    <span>{category.name}</span>
                    {category.subcategories?.length > 0 && (
                      <span className="text-xs text-gray-400">▾</span>
                    )}
                  </Link>
                  {category.subcategories?.length > 0 && (
                    <div
                      className={`absolute left-0 top-full z-40 min-w-[240px] pt-2 ${
                        activeDesktopCategoryId === category.id
                          ? "block"
                          : "hidden"
                      }`}
                      onMouseEnter={() => openDesktopSubmenu(category.id)}
                      onMouseLeave={closeDesktopSubmenuWithDelay}>
                      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-xl">
                        {sortByName(
                          Array.isArray(category.subcategories)
                            ? category.subcategories
                            : [],
                          (sub) => sub?.subcategoryName || "",
                        ).map((sub) => (
                          <div key={sub.id} className="mb-3 last:mb-0">
                            <Link
                              to={`/subcategory/${sub.slug}`}
                              className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                              {sub.subcategoryName}
                            </Link>
                            {sub.childcategories?.length > 0 && (
                              <div className="mt-1 flex flex-col gap-1 pl-3 text-xs text-gray-600">
                                {sortByName(
                                  Array.isArray(sub.childcategories)
                                    ? sub.childcategories
                                    : [],
                                  (child) => child?.childcategoryName || "",
                                ).map((child) => (
                                  <Link
                                    key={child.id}
                                    to={`/childcategory/${child.slug}`}
                                    className="hover:text-blue-600 transition-colors">
                                    {child.childcategoryName}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Mobile Drawer (left slide-in) — local menuCategories ── */}
        {mobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              onClick={() => setMobileDrawerOpen(false)}
            />
            {/* Drawer panel */}
            <div className="fixed left-0 top-0 z-50 h-[100dvh] w-[300px] max-w-[85vw] bg-white shadow-2xl md:hidden flex flex-col">
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-blue-600">
                <div className="flex items-center gap-2">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={siteName}
                      className="h-7 w-auto object-contain brightness-0 invert"
                    />
                  ) : (
                    <span className="font-bold text-white text-base">
                      {siteName}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="theme-btn-skip inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                  aria-label="Close drawer">
                  <FaTimes size={14} />
                </button>
              </div>

              {/* Nav links */}
              <div className="border-b border-gray-100 px-4 py-2">
                <Link
                  to="/"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-gray-700 hover:text-blue-600">
                  🏠 Home
                </Link>
                <Link
                  to={user ? "/account" : "/login"}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-gray-700 hover:text-blue-600">
                  👤 {user ? "My Account" : "Login / Register"}
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-gray-700 hover:text-blue-600">
                  🛒 Cart ({count})
                </Link>
              </div>

              {/* Categories title */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Categories
                </p>
              </div>

              {/* Scrollable categories list */}
              <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
                {mobileDrawerCategories.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    No categories found.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {mobileDrawerCategories.map((category, index) => {
                      const categoryKey =
                        category?.id || category?.slug || `cat-${index}`;
                      const categorySlug = category?.slug
                        ? String(category.slug).trim()
                        : "";
                      const categoryName = category?.name || "Category";
                      const subcategories = sortByName(
                        Array.isArray(category?.subcategories)
                          ? category.subcategories
                          : [],
                        (sub) => sub?.subcategoryName || "",
                      );
                      return (
                        <div
                          key={categoryKey}
                          className="rounded-lg border border-gray-100 overflow-hidden">
                          <div className="flex items-center justify-between bg-white px-3 py-2.5">
                            <Link
                              to={
                                categorySlug ? `/category/${categorySlug}` : "#"
                              }
                              className={`flex-1 text-sm font-semibold line-clamp-1 ${
                                categorySlug
                                  ? "text-gray-800 hover:text-blue-600"
                                  : "text-gray-400 pointer-events-none"
                              }`}
                              onClick={() => {
                                if (categorySlug) setMobileDrawerOpen(false);
                              }}>
                              {categoryName}
                            </Link>
                            {subcategories.length > 0 && (
                              <button
                                type="button"
                                className="theme-btn-skip ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200"
                                onClick={() =>
                                  toggleDrawerCategory(categoryKey)
                                }>
                                {expandedDrawerCategories[categoryKey]
                                  ? "−"
                                  : "+"}
                              </button>
                            )}
                          </div>

                          {expandedDrawerCategories[categoryKey] &&
                            subcategories.length > 0 && (
                              <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 space-y-1.5">
                                {subcategories.map((sub, subIndex) => {
                                  const subKey =
                                    sub?.id || `${categoryKey}-sub-${subIndex}`;
                                  const subSlug = sub?.slug
                                    ? String(sub.slug).trim()
                                    : "";
                                  const subName =
                                    sub?.subcategoryName || "Subcategory";
                                  const childcategories = sortByName(
                                    Array.isArray(sub?.childcategories)
                                      ? sub.childcategories
                                      : [],
                                    (child) =>
                                      child?.childcategoryName || "",
                                  );
                                  return (
                                    <div key={subKey}>
                                      <div className="flex items-center justify-between">
                                        <Link
                                          to={
                                            subSlug
                                              ? `/subcategory/${subSlug}`
                                              : "#"
                                          }
                                          className={`flex-1 text-sm font-medium line-clamp-1 ${
                                            subSlug
                                              ? "text-gray-700 hover:text-blue-600"
                                              : "text-gray-400 pointer-events-none"
                                          }`}
                                          onClick={() => {
                                            if (subSlug)
                                              setMobileDrawerOpen(false);
                                          }}>
                                          {subName}
                                        </Link>
                                        {childcategories.length > 0 && (
                                          <button
                                            type="button"
                                            className="theme-btn-skip ml-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white border border-gray-200 text-xs font-bold text-gray-600"
                                            onClick={() =>
                                              toggleDrawerSubcategory(subKey)
                                            }>
                                            {expandedDrawerSubcategories[subKey]
                                              ? "−"
                                              : "+"}
                                          </button>
                                        )}
                                      </div>
                                      {expandedDrawerSubcategories[subKey] &&
                                        childcategories.length > 0 && (
                                          <div className="mt-1 pl-3 space-y-1">
                                            {childcategories.map(
                                              (child, childIndex) => {
                                                const childKey =
                                                  child?.id ||
                                                  `${subKey}-child-${childIndex}`;
                                                const childSlug = child?.slug
                                                  ? String(child.slug).trim()
                                                  : "";
                                                const childName =
                                                  child?.childcategoryName ||
                                                  "Childcategory";
                                                return (
                                                  <Link
                                                    key={childKey}
                                                    to={
                                                      childSlug
                                                        ? `/childcategory/${childSlug}`
                                                        : "#"
                                                    }
                                                    className={`block text-xs py-0.5 ${
                                                      childSlug
                                                        ? "text-gray-600 hover:text-blue-600"
                                                        : "text-gray-400 pointer-events-none"
                                                    }`}
                                                    onClick={() => {
                                                      if (childSlug)
                                                        setMobileDrawerOpen(
                                                          false,
                                                        );
                                                    }}>
                                                    • {childName}
                                                  </Link>
                                                );
                                              },
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Mobile Category Modal — external categories grid ── */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Modal panel */}
            <div className="fixed inset-x-0 top-0 z-50 h-[100dvh] md:hidden flex flex-col bg-white overflow-hidden">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                  All Categories
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="theme-btn-skip inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                  aria-label="Close categories">
                  <FaTimes size={14} />
                </button>
              </div>
              {/* Scrollable category grid */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {renderExternalCategoryPanelContent(() =>
                  setMobileMenuOpen(false),
                )}
              </div>
            </div>
          </>
        )}
      </header>
    </>
  );
};

export default Header;
