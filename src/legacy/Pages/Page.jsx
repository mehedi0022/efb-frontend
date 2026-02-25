import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetPageBySlugQuery } from '../store/publicApi';

const Page = () => {
    const { slug } = useParams();
    const {
        data: response,
        isLoading,
        isFetching,
        error,
    } = useGetPageBySlugQuery(slug, { skip: !slug });
    const page = response?.data || null;
    const loading = isLoading || isFetching;
    const errorMessage = error ? 'Page not found' : '';

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10 text-center">
                <p className="text-gray-500">Loading page...</p>
            </div>
        );
    }

    if (errorMessage || !page) {
        return (
            <div className="container mx-auto px-4 py-10 text-center">
                <p className="text-red-600 font-semibold">{errorMessage || 'Page not found'}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{page.title || page.name}</h1>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: page.description || '' }} />
        </div>
    );
};

export default Page;
