import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useSiteData } from "../context/SiteDataContext";
import ProductCard from "../components/ProductCard";
import { useGetProductsQuery } from "../store/publicApi";

const PRODUCTS_PER_PAGE = 10;

const CategoryListing = ({ type }) => {
  const { slug } = useParams();
  const { menuCategories, loading: siteLoading } = useSiteData();
  const [currentPage, setCurrentPage] = useState(1);

  const categoryInfo = useMemo(() => {
    if (!menuCategories?.length) return null;

    if (type === "category") {
      return menuCategories.find((cat) => cat.slug === slug) || null;
    }

    if (type === "subcategory") {
      for (const category of menuCategories) {
        const found = category.subcategories?.find((sub) => sub.slug === slug);
        if (found) return { ...found, parentCategory: category };
      }
    }

    if (type === "childcategory") {
      for (const category of menuCategories) {
        for (const sub of category.subcategories || []) {
          const found = sub.childcategories?.find(
            (child) => child.slug === slug,
          );
          if (found)
            return {
              ...found,
              parentSubcategory: sub,
              parentCategory: category,
            };
        }
      }
    }

    return null;
  }, [menuCategories, slug, type]);

  // ✅ Fix: use the correct ID based on type
  const queryParams = useMemo(() => {
    if (!categoryInfo) return null;

    if (type === "category") {
      return {
        category_id: categoryInfo.id,
        page: currentPage,
        per_page: PRODUCTS_PER_PAGE,
      };
    }
    if (type === "subcategory") {
      return {
        subcategory_id: categoryInfo.id,
        page: currentPage,
        per_page: PRODUCTS_PER_PAGE,
      };
    }
    if (type === "childcategory") {
      return {
        childcategory_id: categoryInfo.id,
        page: currentPage,
        per_page: PRODUCTS_PER_PAGE,
      };
    }

    return null;
  }, [categoryInfo, type, currentPage]);

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useGetProductsQuery(queryParams ?? undefined, { skip: !queryParams });

  // ✅ Adjust these keys to match your actual API response shape
  const products = response?.data || [];
  const total = response?.total || response?.meta?.total || 0;
  const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE);

  const loading = isLoading || isFetching;
  const errorMessage = error ? "Failed to load products." : "";

  const title =
    categoryInfo?.name ||
    categoryInfo?.subcategoryName ||
    categoryInfo?.childcategoryName ||
    "Products";

  // Reset to page 1 when slug/type changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [slug, type]);

  if (siteLoading) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">Loading category...</p>
      </div>
    );
  }

  if (!categoryInfo) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">Category not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>

      {loading ? (
        <div className="text-center text-gray-500">Loading products...</div>
      ) : errorMessage ? (
        <div className="text-center text-red-600 font-semibold">
          {errorMessage}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center text-gray-500">No products found.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* ✅ Pagination — only shown if more than one page */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded border text-sm font-medium transition ${
                      page === currentPage
                        ? "bg-blue-600 text-white border-blue-600"
                        : "hover:bg-gray-100"
                    }`}>
                    {page}
                  </button>
                ),
              )}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryListing;
