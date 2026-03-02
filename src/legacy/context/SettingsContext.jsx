import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useGetSettingsQuery } from '../store/publicApi';
import { resolveMediaUrl } from '../utils/media';
import { resolveBrowserTabTitle } from '../utils/tabTitle';

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
        const buttonPrimaryHover = isHexColor(setting?.button_secondary_color) ? setting.button_secondary_color : '#374151';
        const buttonPrimaryText = isHexColor(setting?.button_primary_text_color) ? setting.button_primary_text_color : '#ffffff';
        const buttonSecondaryBg = isHexColor(setting?.button_secondary_bg_color)
            ? setting.button_secondary_bg_color
            : buttonPrimaryHover;
        const buttonSecondaryHover = isHexColor(setting?.button_secondary_hover_color)
            ? setting.button_secondary_hover_color
            : '#1f2937';
        const buttonSecondaryText = isHexColor(setting?.button_secondary_text_color)
            ? setting.button_secondary_text_color
            : buttonPrimaryText;
        const buttonInfoBg = isHexColor(setting?.button_info_bg_color)
            ? setting.button_info_bg_color
            : '#0ea5e9';
        const buttonInfoHover = isHexColor(setting?.button_info_hover_color)
            ? setting.button_info_hover_color
            : '#0284c7';
        const buttonInfoText = isHexColor(setting?.button_info_text_color)
            ? setting.button_info_text_color
            : '#ffffff';

        root.style.setProperty('--frontend-footer-bg', footerBg);
        root.style.setProperty('--frontend-btn-primary', buttonPrimary);
        root.style.setProperty('--frontend-btn-secondary', buttonPrimaryHover);
        root.style.setProperty('--frontend-btn-text', buttonPrimaryText);
        root.style.setProperty('--frontend-btn-primary-bg', buttonPrimary);
        root.style.setProperty('--frontend-btn-primary-hover', buttonPrimaryHover);
        root.style.setProperty('--frontend-btn-primary-text', buttonPrimaryText);
        root.style.setProperty('--frontend-btn-secondary-bg', buttonSecondaryBg);
        root.style.setProperty('--frontend-btn-secondary-hover', buttonSecondaryHover);
        root.style.setProperty('--frontend-btn-secondary-text', buttonSecondaryText);
        root.style.setProperty('--frontend-btn-info-bg', buttonInfoBg);
        root.style.setProperty('--frontend-btn-info-hover', buttonInfoHover);
        root.style.setProperty('--frontend-btn-info-text', buttonInfoText);
    }, [
        setting?.footer_bg_color,
        setting?.button_primary_color,
        setting?.button_secondary_color,
        setting?.button_primary_text_color,
        setting?.button_secondary_bg_color,
        setting?.button_secondary_hover_color,
        setting?.button_secondary_text_color,
        setting?.button_info_bg_color,
        setting?.button_info_hover_color,
        setting?.button_info_text_color
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

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const preferredTitle = resolveBrowserTabTitle(setting);
        if (!preferredTitle) return;

        const currentTitle = String(document.title || '').trim();
        const knownDefaults = [
            '',
            'Naxt Ecommerce',
            String(process.env.NEXT_PUBLIC_APP_NAME || '').trim(),
            String(process.env.NEXT_PUBLIC_LOGIN_PAGE_TITLE || '').trim(),
        ].filter(Boolean);

        if (knownDefaults.includes(currentTitle)) {
            document.title = preferredTitle;
        }
    }, [setting]);

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
