import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaBars,
  FaCommentDots,
  FaFacebookF,
  FaGlobe,
  FaHome,
  FaInstagram,
  FaMapMarkerAlt,
  FaShoppingCart,
  FaTiktok,
  FaUser,
  FaYoutube,
} from "react-icons/fa";
import { useSettings } from "../context/SettingsContext";
import { useSiteData } from "../context/SiteDataContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { resolveMediaUrl } from "../utils/media";

const FALLBACK_CONTACT_PHONE =
  process.env.NEXT_PUBLIC_CONTACT_PHONE || "01700-000000";
const FALLBACK_WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_NOGOD_PHONE || FALLBACK_CONTACT_PHONE;

const normalizeExternalUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === "#") return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
};

const toDigits = (value) => String(value || "").replace(/\D/g, "");

const toBdIntlPhone = (value) => {
  const digits = toDigits(value);
  if (!digits) return "";
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  return digits;
};

const toSocialKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const socialIconByKey = {
  facebook: FaFacebookF,
  youtube: FaYoutube,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  map: FaMapMarkerAlt,
  maps: FaMapMarkerAlt,
  googlemap: FaMapMarkerAlt,
  googlemaps: FaMapMarkerAlt,
  website: FaGlobe,
  web: FaGlobe,
  globe: FaGlobe,
};

const resolveSocialIcon = (value) => {
  const key = toSocialKey(value);
  return socialIconByKey[key] || FaGlobe;
};

const Footer = () => {
  const { setting, loading: isSettingsLoading } = useSettings();
  const {
    contact,
    pages,
    pagesRight,
    usefulLinks,
    referenceLinks,
    socialLinks,
  } = useSiteData();
  const { count } = useCart();
  const { user } = useAuth();

  const logoSrc = resolveMediaUrl(setting?.logo);
  const siteName = setting?.name || "Smart Shop";

  const footerUsefulLinks = useMemo(() => {
    if (Array.isArray(usefulLinks) && usefulLinks.length) return usefulLinks;
    if (Array.isArray(pages) && pages.length) return pages;
    return [];
  }, [usefulLinks, pages]);

  const footerReferenceLinks = useMemo(() => {
    if (Array.isArray(referenceLinks) && referenceLinks.length)
      return referenceLinks;
    if (Array.isArray(pagesRight) && pagesRight.length) return pagesRight;
    return [];
  }, [referenceLinks, pagesRight]);

  const footerSocialLinks = useMemo(() => {
    const links = Array.isArray(socialLinks)
      ? socialLinks.filter((item) => String(item?.url || "").trim() !== "")
      : [];
    if (links.length) return links;

    const fbLink = String(setting?.fb_link || "").trim();
    return fbLink
      ? [
          {
            id: "fallback-facebook",
            title: "Facebook",
            icon: "facebook",
            url: fbLink,
          },
        ]
      : [];
  }, [socialLinks, setting?.fb_link]);

  const facebookLink = useMemo(() => {
    const facebookItem = footerSocialLinks.find((item) => {
      const key = toSocialKey(item?.icon || item?.title);
      return key.includes("facebook");
    });
    return String(facebookItem?.url || "").trim();
  }, [footerSocialLinks]);

  const fbEmbedUrl = useMemo(() => {
    if (!facebookLink) return "";
    const href = encodeURIComponent(facebookLink);
    return `https://www.facebook.com/plugins/page.php?href=${href}&tabs=timeline&width=300&height=300&small_header=false&adapt_container_width=false&hide_cover=true&show_facepile=true`;
  }, [facebookLink]);

  const supportPhone = String(
    contact?.hotline || setting?.hotline || "",
  ).trim();
  const supportEmail = String(contact?.email || "").trim();
  const productDetailHotline = String(
    setting?.hotline || FALLBACK_CONTACT_PHONE,
  ).trim();
  const productDetailWhatsapp = String(
    setting?.whatsapp || setting?.hotline || FALLBACK_WHATSAPP_PHONE,
  ).trim();
  const whatsappNumber = toBdIntlPhone(
    productDetailWhatsapp || productDetailHotline,
  );
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#";
  const footerPaymentEnabled =
    Number(setting?.footer_payment_enabled ?? 1) === 1;
  const howToOrderPage = useMemo(() => {
    const candidates = [
      ...(Array.isArray(footerUsefulLinks) ? footerUsefulLinks : []),
      ...(Array.isArray(footerReferenceLinks) ? footerReferenceLinks : []),
      ...(Array.isArray(pages) ? pages : []),
      ...(Array.isArray(pagesRight) ? pagesRight : []),
    ];

    return (
      candidates.find((page) => {
        const label = String(page?.name || page?.title || "").toLowerCase();
        return /how\s*to\s*order|order/.test(label);
      }) || null
    );
  }, [footerUsefulLinks, footerReferenceLinks, pages, pagesRight]);
  const howToOrderHref = useMemo(() => {
    const slug = String(howToOrderPage?.slug || "").trim();
    return slug ? `/page/${slug}` : "";
  }, [howToOrderPage]);

  const renderPageLink = (page) => {
    const label = String(page?.name || page?.title || "").trim();
    const slug = String(page?.slug || "").trim();
    if (!label) return null;

    return slug ? (
      <Link to={`/page/${slug}`}>{label}</Link>
    ) : (
      <span>{label}</span>
    );
  };

  return (
    <footer style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div className="theme-footer-surface border-t border-black/10">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div>
              <Link to="/" className="inline-block">
                {isSettingsLoading ? (
                  <span className="inline-block h-12 w-36 animate-pulse rounded-md bg-gray-200" />
                ) : logoSrc ? (
                  <img src={logoSrc} alt={siteName} className="h-12 w-auto" />
                ) : (
                  <span className="text-lg font-semibold">{siteName}</span>
                )}
              </Link>
              <div className="theme-footer-panel my-0 max-w-[360px] rounded-2xl p-4 text-gray-700">
                <p className="text-[18px] font-medium leading-[1.45] text-gray-700">
                  {contact?.address || "Address not set"}
                </p>

                <p className="mt-3 text-[16px] leading-[1.45] text-gray-700">
                  <span className="font-semibold text-gray-900">E-mail: </span>
                  {supportEmail ? (
                    <a
                      href={`mailto:${supportEmail}`}
                      className="font-medium text-gray-700 hover:text-gray-900">
                      {supportEmail}
                    </a>
                  ) : (
                    "Not available"
                  )}
                </p>

                <p className="mt-2 text-[16px] leading-[1.45] text-gray-700">
                  <span className="font-semibold text-gray-900">Hotline: </span>
                  {supportPhone ? (
                    <a
                      href={`tel:${supportPhone}`}
                      className="font-medium text-gray-700 hover:text-gray-900">
                      {supportPhone}
                    </a>
                  ) : (
                    "Not available"
                  )}
                </p>
              </div>
              <h5 className="mt-4 text-sm font-bold">FOLLOW US ON:</h5>
              <div className="mt-2 flex items-center gap-2">
                {footerSocialLinks.map((link, index) => {
                  const href = normalizeExternalUrl(link?.url);
                  if (href === "#") return null;

                  const Icon = resolveSocialIcon(link?.icon || link?.title);
                  const title =
                    String(link?.title || "Social link").trim() ||
                    "Social link";

                  return (
                    <a
                      key={link?.id || `${title}-${index}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white"
                      href={href}
                      title={title}
                      target="_blank"
                      rel="noopener noreferrer">
                      <Icon size={14} />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="text-sm">
              <p className="mb-3 font-semibold">Useful Links</p>
              <ul className="space-y-2 text-gray-700">
                {footerUsefulLinks.length > 0 ? (
                  footerUsefulLinks.map((page, index) => (
                    <li
                      key={
                        page?.id ||
                        `${page?.slug || page?.name || "useful"}-${index}`
                      }>
                      {renderPageLink(page)}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No links configured</li>
                )}
              </ul>
            </div>

            <div className="text-sm">
              <p className="mb-3 font-semibold">References</p>
              <ul className="space-y-2 text-gray-700">
                {footerReferenceLinks.length > 0 ? (
                  footerReferenceLinks.map((page, index) => (
                    <li
                      key={
                        page?.id ||
                        `${page?.slug || page?.name || "reference"}-${index}`
                      }>
                      {renderPageLink(page)}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No links configured</li>
                )}
              </ul>
            </div>

            <div className="flex items-center justify-center">
              {facebookLink ? (
                <div className="theme-footer-panel flex h-[300px] w-[300px] items-center justify-center overflow-hidden rounded-xl">
                  {fbEmbedUrl ? (
                    <iframe
                      title="Facebook Page"
                      src={fbEmbedUrl}
                      width="300"
                      height="300"
                      style={{ border: "none", overflow: "hidden" }}
                      scrolling="no"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    />
                  ) : (
                    <a
                      href={normalizeExternalUrl(facebookLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-full w-full items-center justify-center text-[#1877f2]"
                      title="Facebook">
                      <FaFacebookF size={28} />
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {footerPaymentEnabled ? (
            <>
              <div className="mt-6 hidden md:block">
                <img
                  src="/frontEnd/images/SSL03.webp"
                  alt="Secure"
                  className="w-full rounded border border-gray-800"
                />
              </div>
              <div className="mt-4 md:hidden">
                <img
                  src="/frontEnd/images/footerImage.png"
                  alt="Footer"
                  className="w-full rounded"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="theme-footer-bar border-t border-black/10 py-4 pb-[100px] md:pb-4">
          <div className="container mx-auto px-4">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-700">
              <span>{new Date().getFullYear()}</span> | Powered by
              <a
                href="https://freelancerbangladesh.com/"
                target="_blank"
                rel="noopener noreferrer">
                <img
                  src="/frontEnd/images/fcl.png"
                  alt="Freelancer Bangladesh"
                  width="50"
                  height="40"
                  className="inline-block"
                />
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="theme-footer-surface fixed bottom-0 left-0 right-0 z-40 border-t border-gray-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] md:hidden">
        <div className="mx-auto max-w-lg">
          {/* <div className="relative border-b border-gray-300 py-1 text-center">
            {howToOrderHref ? (
              <Link
                to={howToOrderHref}
                className="text-sm font-medium leading-none text-[#111827] underline underline-offset-2"
              >
                How To Order
              </Link>
            ) : (
              <span className="text-sm font-medium leading-none text-[#111827] underline underline-offset-2">
                How To Order
              </span>
            )}
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <span className="h-5 w-5 rounded-full bg-[#ef4444]" />
              <span className="h-3 w-3 rounded-full bg-[#4ade80]" />
            </div>
          </div> */}

          <div className="relative h-[68px]">
            <div className="grid h-full grid-cols-5 items-center px-2 text-[11px] font-medium text-[#111827]">
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-mobile-menu"))
                }
                className="theme-btn-skip flex flex-col items-center gap-1 bg-transparent leading-none">
                <FaBars className="text-[20px]" />
                <span>Categories</span>
              </button>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 leading-none">
                <FaCommentDots className="text-[17px]" />
                <span>Message</span>
              </a>

              <span aria-hidden="true" />

              <Link
                to="/cart"
                className="flex flex-col items-center gap-1 leading-none">
                <FaShoppingCart className="text-[17px]" />
                <span>Cart ({count})</span>
              </Link>

              <Link
                to={user ? "/account" : "/login"}
                className="flex flex-col items-center gap-1 leading-none">
                <FaUser className="text-[17px]" />
                <span>{user ? "Account" : "Login"}</span>
              </Link>
            </div>

            <Link
              to="/"
              className="absolute left-1/2 top-0 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-[22px] flex-col items-center justify-center gap-[2px] rounded-full border-[3px] border-white bg-[#050505] text-white shadow-[0_10px_22px_rgba(0,0,0,0.28)]">
              <FaHome className="text-[20px]" />
              <span className="text-[13px] leading-none">Home</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
