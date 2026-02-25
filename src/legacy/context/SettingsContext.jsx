import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useGetSettingsQuery } from '../store/publicApi';
import { resolveMediaUrl } from '../utils/media';

const SettingsContext = createContext({
    setting: null,
    loading: true,
});

export const SettingsProvider = ({ children }) => {
    const { data: setting, isLoading, isFetching } = useGetSettingsQuery(undefined, {
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;
        const isHexColor = (value) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '').trim());

        const footerBg = isHexColor(setting?.footer_bg_color) ? setting.footer_bg_color : '#ffffff';
        const buttonPrimary = isHexColor(setting?.button_primary_color) ? setting.button_primary_color : '#111827';
        const buttonSecondary = isHexColor(setting?.button_secondary_color) ? setting.button_secondary_color : '#374151';

        root.style.setProperty('--frontend-footer-bg', footerBg);
        root.style.setProperty('--frontend-btn-primary', buttonPrimary);
        root.style.setProperty('--frontend-btn-secondary', buttonSecondary);
        root.style.setProperty('--frontend-btn-text', '#ffffff');
    }, [
        setting?.footer_bg_color,
        setting?.button_primary_color,
        setting?.button_secondary_color
    ]);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const faviconPath = String(setting?.favicon || '').trim();
        const faviconUrl = resolveMediaUrl(faviconPath, '');
        if (!faviconUrl) return;

        const versionSeed = [setting?.id ?? '', setting?.updated_at ?? '', faviconPath].join('-');
        const version = encodeURIComponent(versionSeed || Date.now());
        const separator = faviconUrl.includes('?') ? '&' : '?';
        const cacheBustedUrl = `${faviconUrl}${separator}v=${version}`;

        const ensureFavicon = (selector, relValue) => {
            let linkElement = document.querySelector(selector);
            if (!linkElement) {
                linkElement = document.createElement('link');
                linkElement.setAttribute('rel', relValue);
                document.head.appendChild(linkElement);
            }
            linkElement.setAttribute('href', cacheBustedUrl);
        };

        ensureFavicon('link[rel="icon"]', 'icon');
        ensureFavicon('link[rel="shortcut icon"]', 'shortcut icon');
    }, [setting?.favicon, setting?.id, setting?.updated_at]);

    const value = useMemo(() => ({
        setting: setting || null,
        loading: isLoading || isFetching,
    }), [setting, isLoading, isFetching]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
