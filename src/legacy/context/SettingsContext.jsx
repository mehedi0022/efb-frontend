import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useGetSettingsQuery } from '../store/publicApi';

const SettingsContext = createContext({
    setting: null,
    loading: true,
});

export const SettingsProvider = ({ children }) => {
    const { data: setting, isLoading, isFetching } = useGetSettingsQuery();

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
