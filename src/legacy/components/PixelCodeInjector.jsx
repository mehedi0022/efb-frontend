import { useEffect } from 'react';
import { useSiteData } from '../context/SiteDataContext';
import {
    initializeFacebookPixelId,
    trackFacebookPageView,
} from '../utils/facebookPixel';

const SIMPLE_PIXEL_ID_PATTERN = /^\d{5,20}$/;
const FBQ_INIT_ID_PATTERN = /fbq\s*\(\s*['"]init['"]\s*,\s*['"]?(\d{5,20})['"]?/gi;
const FB_TR_ID_PATTERN = /[?&]id=(\d{5,20})(?:[&#"'>\s]|$)/gi;
const INJECTOR_STATE_KEY = '__legacyPixelInjectorState';

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

const unique = (items = []) => Array.from(new Set(items.filter(Boolean)));

const extractFacebookPixelIds = (rawCode = '') => {
    const snippet = String(rawCode || '').trim();
    if (!snippet) return [];

    if (SIMPLE_PIXEL_ID_PATTERN.test(snippet)) {
        return [snippet];
    }

    const ids = [];
    const collectMatches = (pattern) => {
        pattern.lastIndex = 0;
        let match = pattern.exec(snippet);
        while (match) {
            const id = String(match[1] || '').trim();
            if (SIMPLE_PIXEL_ID_PATTERN.test(id)) {
                ids.push(id);
            }
            match = pattern.exec(snippet);
        }
    };

    collectMatches(FBQ_INIT_ID_PATTERN);
    collectMatches(FB_TR_ID_PATTERN);

    return unique(ids);
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

        const appendNode = (node, parent) => {
            if (!node || !parent) return;
            parent.appendChild(node);
            injectorState.managedNodes.push(node);
        };

        const resolvedPixelIds = unique(
            rawCodes.flatMap((snippet) => extractFacebookPixelIds(snippet))
        );

        if (resolvedPixelIds.length === 0) {
            console.warn(
                '[PixelCodeInjector] No valid Facebook Pixel ID found. Save a pixel ID or a standard fbq init snippet.'
            );
            return undefined;
        }

        // 1. Initialize IDs (Ensures fbevents.js is ready and internal state is updated for Checkout.jsx polling)
        resolvedPixelIds.forEach((pixelId) => {
            initializeFacebookPixelId(pixelId);
        });

        // 2. Inject Raw Snippets (Ensures FB Event Setup Tool detects the pixel and custom logic runs)
        rawCodes.forEach((snippet) => {
            try {
                const fragment = document.createRange().createContextualFragment(snippet);
                Array.from(fragment.childNodes).forEach((node) => {
                    // Inject into head for better detection by automation tools
                    parent.appendChild(node);
                    injectorState.managedNodes.push(node);
                });
            } catch (error) {
                console.error('[PixelCodeInjector] Failed to inject snippet', error);
            }
        });

        // NOTE: We don't call trackFacebookPageView() here because:
        // 1. The raw snippets usually contain fbq('track', 'PageView')
        // 2. MainLayout.jsx also tracks PageView on every route change
        // Manual tracking here would cause triple-firing on initial load.

        return undefined;
    }, [pixels]);

    return null;
};

export default PixelCodeInjector;
