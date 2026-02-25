import React, { createContext, useContext, useMemo } from 'react';
import { useGetSiteDataQuery } from '../store/publicApi';

const SiteDataContext = createContext({
    contact: null,
    pages: [],
    pagesRight: [],
    usefulLinks: [],
    referenceLinks: [],
    socialLinks: [],
    menuCategories: [],
    pixels: [],
    loading: true,
});

export const SiteDataProvider = ({ children }) => {
    const { data, isLoading, isFetching } = useGetSiteDataQuery();

    const value = useMemo(() => ({
        contact: data?.contact || null,
        pages: data?.pages || [],
        pagesRight: data?.pages_right || data?.footer_links?.references || [],
        usefulLinks: data?.footer_links?.useful || data?.pages || [],
        referenceLinks: data?.footer_links?.references || data?.pages_right || [],
        socialLinks: data?.social_links || [],
        menuCategories: data?.menu_categories || [],
        pixels: data?.pixels || [],
        loading: isLoading || isFetching,
    }), [data, isLoading, isFetching]);

    return (
        <SiteDataContext.Provider value={value}>
            {children}
        </SiteDataContext.Provider>
    );
};

export const useSiteData = () => useContext(SiteDataContext);

export default SiteDataContext;
