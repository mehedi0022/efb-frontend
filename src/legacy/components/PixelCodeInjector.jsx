import { useEffect } from 'react';
import { useSiteData } from '../context/SiteDataContext';

const SIMPLE_PIXEL_ID_PATTERN = /^\d{5,20}$/;
const SCRIPT_TAG_PATTERN = /<script[\s>]/i;
const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

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
        if (typeof document === 'undefined') return undefined;

        const rawCodes = Array.isArray(pixels)
            ? pixels
                .map((pixel) => String(pixel?.code || '').trim())
                .filter(Boolean)
            : [];

        if (rawCodes.length === 0) {
            return undefined;
        }

        const injectedNodes = [];
        const appendNode = (node, parent) => {
            parent.appendChild(node);
            injectedNodes.push(node);
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

        if (simplePixelIds.length > 0) {
            const fbPixelBootScript = document.createElement('script');
            const initLines = simplePixelIds
                .map((pixelId) => `fbq('init', '${pixelId}');`)
                .join('\n');

            fbPixelBootScript.textContent = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${initLines}
fbq('track', 'PageView');
            `.trim();

            appendNode(fbPixelBootScript, document.head);

            simplePixelIds.forEach((pixelId) => {
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

        return () => {
            injectedNodes
                .slice()
                .reverse()
                .forEach((node) => {
                    if (node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                });
        };
    }, [pixels]);

    return null;
};

export default PixelCodeInjector;
