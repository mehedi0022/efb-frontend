const normalizeText = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

export const resolveBrowserTabTitle = (setting) => {
    const fromSetting = normalizeText(setting?.browser_tab_title);
    if (fromSetting) return fromSetting;

    const fromName = normalizeText(setting?.name);
    if (fromName) return fromName;

    return normalizeText(process.env.NEXT_PUBLIC_APP_NAME)
        || normalizeText(process.env.NEXT_PUBLIC_LOGIN_PAGE_TITLE)
        || 'Naxt Ecommerce';
};

