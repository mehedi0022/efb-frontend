import { useEffect } from 'react';
import { useSiteData } from '../context/SiteDataContext';
import {
    initializeFacebookPixelId,
    trackFacebookPageView,
} from '../utils/facebookPixel';

const SIMPLE_PIXEL_ID_PATTERN = /^\d{5,20}$/;
const SCRIPT_TAG_PATTERN = /<script[\s>]/i;
const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;
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

const toScriptNode = (sourceScript) => {
    const script = document.createElement('script');

    Array.from(sourceScript.attributes).forEach((attribute) => {
        script.setAttribute(attribute.name, attribute.value);
    });

    if (sourceScript.textContent) {
        script.textContent = sourceScript.textContent;
    }

    return script;
};

const injectHtmlSnippet = (snippet, appendNode) => {
    const template = document.createElement('template');
    template.innerHTML = snippet;

    const scriptNodes = Array.from(template.content.querySelectorAll('script'));
    scriptNodes.forEach((sourceScript) => {
        const script = toScriptNode(sourceScript);
        appendNode(script, document.head);
        sourceScript.remove();
    });

    if (template.content.childNodes.length > 0) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-pixel-code-extra', '1');
        wrapper.style.display = 'none';
        wrapper.appendChild(template.content.cloneNode(true));
        appendNode(wrapper, document.body);
    }
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

        const simplePixelIds = [];
        const customSnippets = [];

        rawCodes.forEach((snippet) => {
            if (SIMPLE_PIXEL_ID_PATTERN.test(snippet)) {
                simplePixelIds.push(snippet);
                return;
            }

            customSnippets.push(snippet);
        });

        const uniqueSimplePixelIds = Array.from(new Set(simplePixelIds));
        if (uniqueSimplePixelIds.length > 0) {
            uniqueSimplePixelIds.forEach((pixelId) => {
                initializeFacebookPixelId(pixelId);
            });
            trackFacebookPageView();

            uniqueSimplePixelIds.forEach((pixelId) => {
                const noscript = document.createElement('noscript');
                noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
                appendNode(noscript, document.body);
            });
        }

        customSnippets.forEach((snippet) => {
            if (SCRIPT_TAG_PATTERN.test(snippet) || HTML_TAG_PATTERN.test(snippet)) {
                injectHtmlSnippet(snippet, appendNode);
                return;
            }

            const script = document.createElement('script');
            script.textContent = snippet;
            appendNode(script, document.head);
        });
    }, [pixels]);

    return null;
};

export default PixelCodeInjector;
