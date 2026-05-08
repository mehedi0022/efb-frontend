import "./globals.css";
import AppProviders from "@/providers/AppProviders";
import { buildApiUrl, env } from "@/config/env";
import PixelPageTracker from "@/hooks/usePixel";
import ScrollToTop from "@/components/common/ScrollToTop";
import StickyCart from "@/components/common/StickyCart";

const DEFAULT_TITLE = env.appName || "Naxt Ecommerce";
const DEFAULT_DESCRIPTION =
  "Next.js frontend and admin panel for ecommerce platform";

const normalizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const stripHtml = (value) =>
  normalizeText(String(value || "").replace(/<[^>]*>/g, " ")).replace(
    /\s+/g,
    " ",
  );

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
        <PixelPageTracker />
        <AppProviders>
          <ScrollToTop />
          <StickyCart />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
