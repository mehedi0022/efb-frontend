import "./globals.css";
import Script from "next/script";
import AppProviders from "@/providers/AppProviders";
import { buildApiUrl, env } from "@/config/env";
import PixelPageTracker from "@/hooks/usePixel";
import ScrollToTop from "@/components/common/ScrollToTop";
import StickyCart from "@/components/common/StickyCart";

const DEFAULT_TITLE = env.appName || "Naxt Ecommerce";
const DEFAULT_DESCRIPTION =
  "Next.js frontend and admin panel for ecommerce platform";
const META_PIXEL_ID = String(
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
).trim();

const normalizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const stripHtml = (value) =>
  normalizeText(String(value || "").replace(/<[^>]*>/g, " ")).replace(
    /\s+/g,
    " ",
  );

const buildMetaPixelSnippet = (pixelId) => `
  !(function(f,b,e,v,n,t,s){
    if(f.fbq)return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;
    n.push=n;
    n.loaded=!0;
    n.version='2.0';
    n.queue=[];
    t=b.createElement(e);
    t.async=!0;
    t.src=v;
    s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  })(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', ${JSON.stringify(pixelId)});
  fbq('track', 'PageView');
`;

const resolveMediaUrl = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (/^(https?:)?\/\//i.test(normalized)) return normalized;
  if (/^(data:|blob:)/i.test(normalized)) return "";

  const cleanPath = normalized.replace(/^\/+/, "");
  if (!cleanPath) return "";

  const apiBase = normalizeText(env.apiBaseUrl || "");
  if (apiBase) return `${apiBase}/${cleanPath}`;

  return `/${cleanPath}`;
};

const fetchPublicSettings = async () => {
  const endpoint = buildApiUrl("/api/v1/settings");
  if (!endpoint) return null;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.data || null;
  } catch {
    return null;
  }
};

export async function generateMetadata() {
  const setting = await fetchPublicSettings();
  const title =
    normalizeText(setting?.browser_tab_title) ||
    normalizeText(setting?.name) ||
    DEFAULT_TITLE;
  const description = stripHtml(setting?.description) || DEFAULT_DESCRIPTION;
  const favicon = resolveMediaUrl(setting?.favicon);

  return {
    title,
    description,
    ...(favicon
      ? {
          icons: {
            icon: favicon,
            shortcut: favicon,
          },
        }
      : {}),
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {META_PIXEL_ID ? (
          <>
            <Script
              id="meta-pixel-base"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: buildMetaPixelSnippet(META_PIXEL_ID),
              }}
            />
            <PixelPageTracker />
          </>
        ) : null}
        <AppProviders>
          <ScrollToTop />
          <StickyCart />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
