import { useEffect } from 'react';
import { useSiteData } from '../context/SiteDataContext';
import { initializeFacebookPixelId, trackFacebookPageView } from '../utils/facebookPixel';

const INJECTOR_STATE_KEY = '__legacyPixelInjectorState';
const SIMPLE_PIXEL_ID_PATTERN = /^\d{5,20}$/;
const FBQ_PAGE_VIEW_PATTERN = /fbq\(\s*['"]track['"]\s*,\s*['"]PageView['"]\s*\)/i;

const extractPixelIdsFromSnippet = (snippet = '') => {
    const ids = new Set();
    const pattern = /fbq\(\s*['"]init['"]\s*,\s*['"](\d{5,20})['"]\s*\)/gi;
    let match = pattern.exec(snippet);

    while (match) {
        const candidate = String(match[1] || '').trim();
        if (SIMPLE_PIXEL_ID_PATTERN.test(candidate)) {
            ids.add(candidate);
        }
        match = pattern.exec(snippet);
    }

    return Array.from(ids);
};

const getInjectorState = () => {
    if (typeof window === 'undefined') return null;

    if (!window[INJECTOR_STATE_KEY] || typeof window[INJECTOR_STATE_KEY] !== 'object') {
        window[INJECTOR_STATE_KEY] = {
            signature: '',
            managedNodes: [],
        };
    }

    return window[INJECTOR_STATE_KEY];
};

const clearManagedNodes = (state) => {
    if (!state || !Array.isArray(state.managedNodes)) return;

    state.managedNodes
        .slice()
        .reverse()
        .forEach((node) => {
            if (node?.parentNode) {
                node.parentNode.removeChild(node);
            }
        });

    state.managedNodes = [];
};

const PixelCodeInjector = () => {
    const { pixels = [] } = useSiteData();

    useEffect(() => {
        if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;

        const injectorState = getInjectorState();
        if (!injectorState) return undefined;

        const rawCodes = Array.isArray(pixels)
            ? pixels
                .map((pixel) => String(pixel?.code || '').trim())
                .filter(Boolean)
            : [];

        const nextSignature = rawCodes.join('\n<!--pixel-code-split-->\n');

        if (rawCodes.length === 0) {
            if (injectorState.signature) {
                clearManagedNodes(injectorState);
                injectorState.signature = '';
            }
            return undefined;
        }

        if (injectorState.signature === nextSignature) {
            return undefined;
        }

        clearManagedNodes(injectorState);
        injectorState.signature = nextSignature;

        // Parse supported formats only:
        // 1) plain pixel ID
        // 2) standard snippet containing fbq('init', 'PIXEL_ID')
        const parsedPixelIds = new Set();
        let shouldTrackPageView = false;
        let hasUnsupportedEntry = false;

        rawCodes.forEach((entry) => {
            if (SIMPLE_PIXEL_ID_PATTERN.test(entry)) {
                parsedPixelIds.add(entry);
                shouldTrackPageView = true;
                return;
            }

            const idsFromSnippet = extractPixelIdsFromSnippet(entry);
            if (idsFromSnippet.length === 0) {
                hasUnsupportedEntry = true;
                return;
            }

            idsFromSnippet.forEach((id) => parsedPixelIds.add(id));
            if (FBQ_PAGE_VIEW_PATTERN.test(entry)) {
                shouldTrackPageView = true;
            }
        });

        let initializedAnyPixel = false;
        parsedPixelIds.forEach((pixelId) => {
            const initialized = initializeFacebookPixelId(pixelId);
            initializedAnyPixel = initializedAnyPixel || initialized;
        });

        if (hasUnsupportedEntry) {
            console.warn('[PixelCodeInjector] Ignored unsupported pixel code. Use Pixel ID or standard fbq init snippet only.');
        }

        if (initializedAnyPixel && shouldTrackPageView) {
            // Send an initial page view after successful init to make Test Events verification easier.
            trackFacebookPageView();
        }

        return undefined;
    }, [pixels]);

    return null;
};

export default PixelCodeInjector;
