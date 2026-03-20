import { useEffect } from 'react';
import { useSiteData } from '../context/SiteDataContext';

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



        // Inject Raw Snippets exactly as they come from the API
        // No regex or extraction mechanism is used here.
        rawCodes.forEach((snippet) => {
            try {
                const fragment = document.createRange().createContextualFragment(snippet);
                Array.from(fragment.childNodes).forEach((node) => {
                    // Standard practice: inject scripts into head/body to execute
                    if (document.head) {
                        document.head.appendChild(node);
                    } else {
                        document.body.appendChild(node);
                    }
                    injectorState.managedNodes.push(node);
                });
            } catch (error) {
                console.error('[PixelCodeInjector] Failed to inject exact pixel snippet', error);
            }
        });

        return undefined;
    }, [pixels]);

    return null;
};

export default PixelCodeInjector;
