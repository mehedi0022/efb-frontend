import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSiteData } from '../context/SiteDataContext';
import ProductCard from '../components/ProductCard';
import { useGetProductsQuery } from '../store/publicApi';

const CategoryListing = ({ type }) => {
    const { slug } = useParams();
    const { menuCategories, loading: siteLoading } = useSiteData();

    const categoryInfo = useMemo(() => {
        if (!menuCategories?.length) return null;

        if (type === 'category') {
            return menuCategories.find((cat) => cat.slug === slug) || null;
        }

        if (type === 'subcategory') {
            for (const category of menuCategories) {
                const found = category.subcategories?.find((sub) => sub.slug === slug);
                if (found) {
                    return { ...found, parentCategory: category };
                }
            }
        }

        if (type === 'childcategory') {
            for (const category of menuCategories) {
                for (const sub of category.subcategories || []) {
                    const found = sub.childcategories?.find((child) => child.slug === slug);
                    if (found) {
                        return { ...found, parentCategory: category };
                    }
                }
            }
        }

        return null;
    }, [menuCategories, slug, type]);

    const categoryId = categoryInfo?.parentCategory?.id || categoryInfo?.id || null;
    const {
        data: response,
        isLoading,
        isFetching,
        error,
    } = useGetProductsQuery(
        categoryId ? { category_id: categoryId } : undefined,
        { skip: !categoryId }
    );

    const products = response?.data || [];
    const loading = isLoading || isFetching;
    const errorMessage = error ? 'Failed to load products.' : '';

    const title = categoryInfo?.name || categoryInfo?.subcategoryName || categoryInfo?.childcategoryName || 'Products';

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
                <div className="text-center text-red-600 font-semibold">{errorMessage}</div>
            ) : products.length === 0 ? (
                <div className="text-center text-gray-500">No products found.</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryListing;
