import React, { useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import { useSearchParams } from 'react-router-dom';
import { useGetProductsQuery } from '../store/publicApi';

const ProductList = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const categoryId = searchParams.get('category_id') || '';
    const page = Number(searchParams.get('page') || 1);

    const queryParams = useMemo(() => ({
        search: searchParams.get('search') || undefined,
        category_id: categoryId || undefined,
        page,
    }), [searchParams, categoryId, page]);

    const {
        data: response,
        isLoading,
        isFetching,
    } = useGetProductsQuery(queryParams);

    const products = response?.data || [];
    const meta = response || null;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Shop</h1>
            </div>

            {isLoading || isFetching ? (
                <div className="text-center p-10">Loading products...</div>
            ) : products.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                    {/* Pagination (Simple Next/Prev) */}
                    <div className="flex justify-center gap-4">
                        <button
                            disabled={!meta?.prev_page_url}
                            onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: meta.current_page - 1 })}
                            className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-100"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2">Page {meta?.current_page} of {meta?.last_page}</span>
                        <button
                            disabled={!meta?.next_page_url}
                            onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: meta.current_page + 1 })}
                            className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-100"
                        >
                            Next
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center p-10 text-gray-500">No products found.</div>
            )}
        </div>
    );
};

export default ProductList;
