import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  useGetBannersQuery,
  useGetExternalFeaturedCategoriesQuery,
  useGetExternalTopSellQuery,
  useGetExternalHotDealsQuery,
  useGetExternalCategoryProductsQuery,
  useGetHomeCategoriesQuery,
} from "../store/publicApi";
import { resolveMediaUrl } from "../utils/media";
import StorefrontProductCard from "../components/StorefrontProductCard";
import { useSettings } from "../context/SettingsContext";
import { resolveBrowserTabTitle } from "../utils/tabTitle";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_EXTERNAL_IMAGE_BASE ||
  "https://freelancerbangladesh.com/";
const CATEGORY_PRODUCTS_PER_PAGE = 5;

const resolveImage = (src, base = IMAGE_BASE) => {
  if (!src) return "https://placehold.co/600x600?text=Product";
  const normalizedSrc =
    typeof src === "object" && src !== null ? src.image || src.path || "" : src;
  if (!normalizedSrc) return "https://placehold.co/600x600?text=Product";
  if (/^https?:\/\//i.test(normalizedSrc)) return normalizedSrc;
  const cleaned = String(normalizedSrc).replace(/^\/+/, "");
  if (!base) {
    return `/${cleaned}`;
  }
  return `${base}${cleaned}`;
};

const pickNonEmptyText = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = candidate.replace(/<[^>]+>/g, "").trim();
    if (normalized) return normalized;
  }
  return "";
};

const isExternalHttpUrl = (value) =>
  /^https?:\/\//i.test(String(value || "").trim());

const resolveExternalCategorySlug = (category) =>
  pickNonEmptyText(
    category?.category_slug,
    category?.slug,
    category?.category?.slug,
    category?.category_info?.slug,
    category?.cat_slug,
  );

const resolveExternalCategoryName = (category) => {
  const name = pickNonEmptyText(
    category?.category_name,
    category?.name,
    category?.categoryName,
    category?.title,
    category?.category?.name,
    category?.category?.category_name,
    category?.category_info?.name,
    category?.category_info?.category_name,
  );

  if (name) return name;

  const slug = resolveExternalCategorySlug(category);
  if (slug) return slug.replace(/[-_]+/g, " ");

  return "Category";
};

const SkeletonCard = () => (
  <div className="animate-pulse bg-white border border-gray-100 rounded-lg overflow-hidden">
    <div className="h-40 bg-gray-200" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-gray-200 rounded" />
      <div className="h-3 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

const Pagination = ({ current, last, onPage }) => {
  if (!last || last <= 1) return null;

  const pages = [];
  for (let i = 1; i <= last; i += 1) {
    if (i === 1 || i === last || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (i === current - 2 || i === current + 2) {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        type="button"
        onClick={() => onPage(Math.max(1, current - 1))}
        disabled={current <= 1}
        className={`px-3 py-1 rounded border text-sm ${current <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}
      >
        <FiChevronLeft />
      </button>
      {pages.map((page, index) =>
        page === "..." ? (
          <span key={`gap-${index}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPage(page)}
            className={`px-3 py-1 rounded border text-sm ${page === current ? "bg-black text-white border-black" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}
          >
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPage(Math.min(last, current + 1))}
        disabled={current >= last}
        className={`px-3 py-1 rounded border text-sm ${current >= last ? "text-gray-400 border-gray-200" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}
      >
        <FiChevronRight />
      </button>
    </div>
  );
};

const Home = () => {
  const { setting } = useSettings();
  const [topSellPage, setTopSellPage] = useState(1);
  const [hotDealsPage, setHotDealsPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [bannerIndex, setBannerIndex] = useState(0);
  const featuredTrackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const fallbackBanners = [
    {
      id: "fallback-banner-1",
      title: "Featured Collections",
      link: "/products",
      image: "https://placehold.co/1200x400?text=Featured+Collections",
    },
  ];

  const { data: bannersResponse } = useGetBannersQuery({ limit: 10 });
  const fetchedBanners = Array.isArray(bannersResponse?.data)
    ? bannersResponse.data
    : [];
  const banners = fetchedBanners.length > 0 ? fetchedBanners : fallbackBanners;
  const activeBanner = banners[bannerIndex] || banners[0] || fallbackBanners[0];

  const {
    data: featuredResponse,
    isLoading: isFeaturedLoading,
    isFetching: isFeaturedFetching,
  } = useGetExternalFeaturedCategoriesQuery({ page: 1, limit: 20 });
  const featuredCategories = Array.isArray(featuredResponse?.data)
    ? featuredResponse.data
    : [];
  const loadingFeatured = isFeaturedLoading || isFeaturedFetching;

  const {
    data: topSellResponse,
    isLoading: isTopSellLoading,
    isFetching: isTopSellFetching,
  } = useGetExternalTopSellQuery({ page: topSellPage, limit: 12 });
  const topSell = Array.isArray(topSellResponse?.data)
    ? topSellResponse.data
    : [];
  const topSellMeta = {
    page: topSellResponse?.meta?.page || topSellPage,
    last_page: topSellResponse?.meta?.last_page || 1,
  };
  const loadingTopSell = isTopSellLoading || isTopSellFetching;

  const {
    data: hotDealsResponse,
    isLoading: isHotDealsLoading,
    isFetching: isHotDealsFetching,
  } = useGetExternalHotDealsQuery({ page: hotDealsPage, limit: 12 });
  const hotDeals = Array.isArray(hotDealsResponse?.data)
    ? hotDealsResponse.data
    : [];
  const hotDealsMeta = {
    page: hotDealsResponse?.meta?.page || hotDealsPage,
    last_page: hotDealsResponse?.meta?.last_page || 1,
  };
  const loadingHotDeals = isHotDealsLoading || isHotDealsFetching;

  const {
    data: categoryResponse,
    isLoading: isCategoryLoading,
    isFetching: isCategoryFetching,
    error: categoryError,
  } = useGetExternalCategoryProductsQuery({
    cat_page: 1,
    cat_limit: 10,
    prod_page: categoryPage,
    prod_limit: CATEGORY_PRODUCTS_PER_PAGE,
  });
  const categorySections = Array.isArray(categoryResponse?.data)
    ? categoryResponse.data
    : [];
  const categoryMeta = {
    current_page:
      categoryResponse?.meta?.product_pagination?.current_page || categoryPage,
    last_page: categoryResponse?.meta?.product_pagination?.last_page || 1,
  };
  const loadingCategories = isCategoryLoading || isCategoryFetching;
  const error = categoryError ? "Products are unavailable right now." : "";

  const {
    data: homeCategoriesResponse,
    isLoading: isHomeCatLoading,
    isFetching: isHomeCatFetching,
  } = useGetHomeCategoriesQuery();
  const homeCategories = Array.isArray(homeCategoriesResponse?.data)
    ? homeCategoriesResponse.data
    : [];
  const loadingHomeCategories = isHomeCatLoading || isHomeCatFetching;

  const updateFeaturedScrollState = () => {
    const track = featuredTrackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scrollFeaturedBy = (direction) => {
    const track = featuredTrackRef.current;
    if (!track) return;
    const amount = Math.max(240, Math.round(track.clientWidth * 0.9));
    track.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    updateFeaturedScrollState();
  }, [loadingFeatured, featuredCategories.length]);

  useEffect(() => {
    const track = featuredTrackRef.current;
    if (!track) return undefined;
    const handleScroll = () => updateFeaturedScrollState();
    track.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    return () => {
      track.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    setBannerIndex((prev) => {
      if (banners.length <= 0) return 0;
      if (prev >= banners.length) return 0;
      return prev;
    });
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return undefined;

    const interval = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [banners.length]);

  const handleTopSellPage = (page) => {
    if (page === topSellMeta.page) return;
    setTopSellPage(page);
  };

  const handleHotDealsPage = (page) => {
    if (page === hotDealsMeta.page) return;
    setHotDealsPage(page);
  };

  const handleCategoryPage = (page) => {
    if (page === categoryMeta.current_page) return;
    setCategoryPage(page);
  };

  const bannerLink = String(activeBanner?.link || "").trim();
  const bannerTitle = String(activeBanner?.title || "").trim();
  const bannerImage = resolveMediaUrl(
    activeBanner?.image,
    "https://placehold.co/1200x400?text=Banner",
  );
  const normalizedBannerLink = bannerLink
    ? isExternalHttpUrl(bannerLink)
      ? bannerLink
      : bannerLink.startsWith("/")
        ? bannerLink
        : `/${bannerLink}`
    : "";

  useEffect(() => {
    const appTitle = resolveBrowserTabTitle(setting);
    document.title = `${appTitle} | Home`;
  }, [setting]);

  return (
    <div className="bg-[#f3f4f6]">
      <section className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm relative">
          <div className="h-48 sm:h-64 md:h-80 overflow-hidden">
            {normalizedBannerLink ? (
              isExternalHttpUrl(normalizedBannerLink) ? (
                <a
                  href={normalizedBannerLink}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-full w-full"
                >
                  <img
                    src={bannerImage}
                    alt={bannerTitle || `Banner ${bannerIndex + 1}`}
                    className="h-full w-full object-cover transition-opacity duration-700"
                  />
                </a>
              ) : (
                <Link to={normalizedBannerLink} className="block h-full w-full">
                  <img
                    src={bannerImage}
                    alt={bannerTitle || `Banner ${bannerIndex + 1}`}
                    className="h-full w-full object-cover transition-opacity duration-700"
                  />
                </Link>
              )
            ) : (
              <img
                src={bannerImage}
                alt={bannerTitle || `Banner ${bannerIndex + 1}`}
                className="h-full w-full object-cover transition-opacity duration-700"
              />
            )}
            {bannerTitle && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 py-4 sm:px-6">
                <p className="line-clamp-2 text-sm font-semibold text-white sm:text-lg">
                  {bannerTitle}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setBannerIndex(
                (prev) => (prev - 1 + banners.length) % banners.length,
              )
            }
            disabled={banners.length <= 1}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/70 text-white p-2 rounded-full"
          >
            <FiChevronLeft />
          </button>
          <button
            type="button"
            onClick={() =>
              setBannerIndex((prev) => (prev + 1) % banners.length)
            }
            disabled={banners.length <= 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/70 text-white p-2 rounded-full"
          >
            <FiChevronRight />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((banner, idx) => (
              <button
                key={banner?.id || idx}
                type="button"
                onClick={() => setBannerIndex(idx)}
                className={`h-2 w-2 rounded-full ${idx === bannerIndex ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 mt-10">
        <h3 className="text-lg font-semibold text-center mb-4">
          Featured Category
        </h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollFeaturedBy("left")}
            disabled={!canScrollLeft}
            className={`absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-md transition ${canScrollLeft ? "hover:bg-gray-900 hover:text-white" : "opacity-40 cursor-not-allowed"}`}
            aria-label="Scroll featured categories left"
          >
            <FiChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => scrollFeaturedBy("right")}
            disabled={!canScrollRight}
            className={`absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-md transition ${canScrollRight ? "hover:bg-gray-900 hover:text-white" : "opacity-40 cursor-not-allowed"}`}
            aria-label="Scroll featured categories right"
          >
            <FiChevronRight />
          </button>

          <div
            ref={featuredTrackRef}
            className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-3 px-10"
          >
            {loadingFeatured ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={`featured-skeleton-${idx}`}
                  className="min-w-[140px] bg-white rounded-lg shadow-sm p-3 flex flex-col items-center"
                >
                  <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
                  <div className="mt-3 h-3 w-16 rounded bg-gray-200 animate-pulse" />
                </div>
              ))
            ) : featuredCategories.length === 0 ? (
              <div className="w-full py-6 text-center text-sm text-gray-500">
                No featured categories found.
              </div>
            ) : (
              featuredCategories.map((category, idx) => {
                const slug = resolveExternalCategorySlug(category);
                const name = resolveExternalCategoryName(category);
                const image = resolveImage(category?.image);
                return (
                  <Link
                    key={slug || idx}
                    to={`/category/external/${slug}`}
                    className="min-w-[140px] bg-white rounded-lg shadow-sm p-3 flex flex-col items-center hover:shadow-md transition"
                  >
                    <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden">
                      <img
                        src={image}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium text-gray-700 text-center line-clamp-1">
                      {name}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Show on Home Categories */}
      {(loadingHomeCategories || homeCategories.length > 0) && (
        <section className="max-w-6xl mx-auto px-4 mt-10">
          <div className="space-y-8">
            {(loadingHomeCategories
              ? Array.from({ length: 2 })
              : homeCategories
            ).map((cat, idx) => {
              const catName = cat?.name || "Category";
              const catSlug = cat?.slug || "";
              const catProducts = (cat?.products || []).slice(
                0,
                CATEGORY_PRODUCTS_PER_PAGE,
              );
              return (
                <div key={catSlug || idx}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {loadingHomeCategories ? "" : catName}
                    </h3>
                    {!loadingHomeCategories && (
                      <Link
                        to={`/products?category=${catSlug}`}
                        className="inline-flex items-center rounded bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                      >
                        SEE MORE
                      </Link>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(loadingHomeCategories
                      ? Array.from({ length: CATEGORY_PRODUCTS_PER_PAGE })
                      : catProducts
                    ).map((item, productIdx) => (
                      <div key={item?.id || item?.slug || productIdx}>
                        {loadingHomeCategories ? (
                          <SkeletonCard />
                        ) : (
                          <StorefrontProductCard item={item} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* <section className="max-w-6xl mx-auto px-4 mt-10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Top Sell</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(loadingTopSell ? Array.from({ length: 12 }) : topSell).map((item, idx) => (
                        <div key={item?.id || item?.product_info?.slug || idx}>
                            {loadingTopSell ? <SkeletonCard /> : <StorefrontProductCard item={item} />}
                        </div>
                    ))}
                </div>
                <Pagination current={topSellMeta.page} last={topSellMeta.last_page} onPage={handleTopSellPage} />
            </section> */}

      {/* <section className="max-w-6xl mx-auto px-4 mt-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Hot Deals</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {(loadingHotDeals ? Array.from({ length: 12 }) : hotDeals).map(
            (item, idx) => (
              <div key={item?.id || item?.product_info?.slug || idx}>
                {loadingHotDeals ? (
                  <SkeletonCard />
                ) : (
                  <StorefrontProductCard item={item} />
                )}
              </div>
            ),
          )}
        </div>
        <Pagination
          current={hotDealsMeta.page}
          last={hotDealsMeta.last_page}
          onPage={handleHotDealsPage}
        />
      </section> */}

      <section className="max-w-6xl mx-auto px-4 mt-12 pb-16">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {(loadingCategories
            ? Array.from({ length: 3 })
            : categorySections
          ).map((category, idx) => {
            const name = resolveExternalCategoryName(category);
            const slug = resolveExternalCategorySlug(category);
            const products = (category?.products?.data ||
              category?.products ||
              []
            ).slice(0, CATEGORY_PRODUCTS_PER_PAGE);
            return (
              <div key={slug || idx}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-semibold text-gray-800">
                    {name}
                  </h4>
                  <Link
                    to={`/products?category=${slug}`}
                    className="inline-flex items-center rounded bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    SEE MORE
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {(loadingCategories
                    ? Array.from({ length: CATEGORY_PRODUCTS_PER_PAGE })
                    : products
                  ).map((item, productIndex) => (
                    <div
                      key={item?.id || item?.product_info?.slug || productIndex}
                    >
                      {loadingCategories ? (
                        <SkeletonCard />
                      ) : (
                        <StorefrontProductCard item={item} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleCategoryPage(Math.max(1, categoryMeta.current_page - 1))
              }
              disabled={categoryMeta.current_page <= 1}
              className={`px-3 py-1 rounded border text-sm ${categoryMeta.current_page <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}
            >
              <FiChevronLeft />
            </button>
            <span className="text-sm text-gray-600">
              {categoryMeta.current_page} / {categoryMeta.last_page}
            </span>
            <button
              type="button"
              onClick={() =>
                handleCategoryPage(
                  Math.min(
                    categoryMeta.last_page,
                    categoryMeta.current_page + 1,
                  ),
                )
              }
              disabled={categoryMeta.current_page >= categoryMeta.last_page}
              className={`px-3 py-1 rounded border text-sm ${categoryMeta.current_page >= categoryMeta.last_page ? "text-gray-400 border-gray-200" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
