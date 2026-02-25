import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useGetExternalSearchQuery } from '../store/publicApi';
import StorefrontProductCard from '../components/StorefrontProductCard';

const Pagination = ({ current, last, onPage }) => {
    if (!last || last <= 1) return null;

    const pages = [];
    for (let i = 1; i <= last; i += 1) {
        if (i === 1 || i === last || (i >= current - 1 && i <= current + 1)) {
            pages.push(i);
        } else if (i === current - 2 || i === current + 2) {
            pages.push('...');
        }
    }

    return (
        <div className="flex items-center justify-center gap-2 mt-6">
            <button
                type="button"
                onClick={() => onPage(Math.max(1, current - 1))}
                disabled={current <= 1}
                className={`px-3 py-1 rounded border text-sm ${current <= 1 ? 'text-gray-400 border-gray-200' : 'border-gray-300 text-gray-700 hover:border-gray-500'}`}
            >
                <FiChevronLeft />
            </button>
            {pages.map((page, index) => (
                page === '...'
                    ? <span key={`gap-${index}`} className="px-2 text-gray-400">...</span>
                    : (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPage(page)}
                            className={`px-3 py-1 rounded border text-sm ${page === current ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-700 hover:border-gray-500'}`}
                        >
                            {page}
                        </button>
                    )
            ))}
            <button
                type="button"
                onClick={() => onPage(Math.min(last, current + 1))}
                disabled={current >= last}
                className={`px-3 py-1 rounded border text-sm ${current >= last ? 'text-gray-400 border-gray-200' : 'border-gray-300 text-gray-700 hover:border-gray-500'}`}
            >
                <FiChevronRight />
            </button>
        </div>
    );
};

const ExternalSearch = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [page, setPage] = useState(1);
    const keyword = searchParams.get('keyword') || '';
    const trimmedKeyword = keyword.trim();
    const limit = 24;

    useEffect(() => {
        setPage(Number(searchParams.get('page') || 1));
    }, [searchParams]);

    const {
        data: response,
        isLoading,
        isFetching,
        error,
    } = useGetExternalSearchQuery(
        trimmedKeyword.length >= 2 ? { keyword: trimmedKeyword, page, limit } : { keyword: '', page, limit },
        { skip: trimmedKeyword.length < 2 }
    );

    const products = Array.isArray(response?.data) ? response.data : [];
    const meta = response?.meta || {};
    const currentPage = meta.page || page;
    const lastPage = meta.last_page || 1;
    const total = meta.total || products.length;
    const loading = isLoading || isFetching;

    const title = useMemo(() => (
        trimmedKeyword ? `Search results for \"${trimmedKeyword}\"` : 'Search'
    ), [trimmedKeyword]);

    const handlePage = (nextPage) => {
        setSearchParams({ keyword: trimmedKeyword, page: String(nextPage) });
    };

    return (
        <div className="container mx-auto px-4 py-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {trimmedKeyword ? (
                    <p className="text-sm text-gray-500">{total} products found</p>
                ) : null}
            </div>

            {trimmedKeyword.length < 2 ? (
                <div className="text-center text-gray-500">Type at least 2 characters to search.</div>
            ) : loading ? (
                <div className="text-center text-gray-500">Loading products...</div>
            ) : error ? (
                <div className="text-center text-red-600 font-semibold">Failed to load products.</div>
            ) : products.length === 0 ? (
                <div className="text-center text-gray-500">No products found.</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {products.map((item) => (
                            <StorefrontProductCard key={item?.id || item?.product_id || item?.product_info?.slug} item={item} />
                        ))}
                    </div>
                    <Pagination current={currentPage} last={lastPage} onPage={handlePage} />
                </>
            )}
        </div>
    );
};

export default ExternalSearch;
