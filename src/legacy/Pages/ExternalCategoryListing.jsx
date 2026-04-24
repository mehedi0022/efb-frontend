import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useGetExternalCategoryBySlugQuery } from "../store/publicApi";
import StorefrontProductCard from "../components/StorefrontProductCard";

const toTitle = (value) =>
  String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

const normalizeCategorySlug = (value) => {
  if (!value) return "";
  let normalized = String(value).trim();
  if (!normalized) return "";

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep original value if URI decode fails.
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
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        type="button"
        onClick={() => onPage(Math.max(1, current - 1))}
        disabled={current <= 1}
        className={`px-3 py-1 rounded border text-sm ${current <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}>
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
            className={`px-3 py-1 rounded border text-sm ${page === current ? "bg-black text-white border-black" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}>
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPage(Math.min(last, current + 1))}
        disabled={current >= last}
        className={`px-3 py-1 rounded border text-sm ${current >= last ? "text-gray-400 border-gray-200" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}>
        <FiChevronRight />
      </button>
    </div>
  );
};

const ExternalCategoryListing = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams(); // ← read query params
  const categoryId = searchParams.get("category_id") || null;
  const normalizedSlug = useMemo(() => normalizeCategorySlug(slug), [slug]);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [normalizedSlug, categoryId]);

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useGetExternalCategoryBySlugQuery(
    normalizedSlug
      ? {
          slug: normalizedSlug,
          page,
          limit,
          ...(categoryId && { category_id: categoryId }),
        }
      : { slug: "", page, limit },
    { skip: !normalizedSlug },
  );

  const products = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || {};
  const currentPage = meta.page || page;
  const lastPage = meta.last_page || 1;
  const loading = isLoading || isFetching;
  const title = useMemo(
    () => toTitle(normalizedSlug || slug || "Category"),
    [normalizedSlug, slug],
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">External category products</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading products...</div>
      ) : error ? (
        <div className="text-center text-red-600 font-semibold">
          Failed to load products.
        </div>
      ) : products.length === 0 ? (
        <div className="text-center text-gray-500">No products found.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((item) => (
              <StorefrontProductCard
                key={item?.id || item?.product_id || item?.product_info?.slug}
                item={item}
              />
            ))}
          </div>
          <Pagination current={currentPage} last={lastPage} onPage={setPage} />
        </>
      )}
    </div>
  );
};

export default ExternalCategoryListing;
