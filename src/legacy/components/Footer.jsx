import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
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
} from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import { useSiteData } from '../context/SiteDataContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';

const normalizeExternalUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw || raw === '#') return '#';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, '')}`;
};

const toSocialKey = (value) => String(value || '').trim().toLowerCase();

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
    const { contact, pages, pagesRight, usefulLinks, referenceLinks, socialLinks } = useSiteData();
    const { count } = useCart();
    const { user } = useAuth();

    const logoSrc = resolveMediaUrl(setting?.logo);
    const siteName = setting?.name || 'Smart Shop';

    const footerUsefulLinks = useMemo(() => {
        if (Array.isArray(usefulLinks) && usefulLinks.length) return usefulLinks;
        if (Array.isArray(pages) && pages.length) return pages;
        return [];
    }, [usefulLinks, pages]);

    const footerReferenceLinks = useMemo(() => {
        if (Array.isArray(referenceLinks) && referenceLinks.length) return referenceLinks;
        if (Array.isArray(pagesRight) && pagesRight.length) return pagesRight;
        return [];
    }, [referenceLinks, pagesRight]);

    const footerSocialLinks = useMemo(() => {
        const links = Array.isArray(socialLinks)
            ? socialLinks.filter((item) => String(item?.url || '').trim() !== '')
            : [];
        if (links.length) return links;

        const fbLink = String(setting?.fb_link || '').trim();
        return fbLink
            ? [{ id: 'fallback-facebook', title: 'Facebook', icon: 'facebook', url: fbLink }]
            : [];
    }, [socialLinks, setting?.fb_link]);

    const facebookLink = useMemo(() => {
        const facebookItem = footerSocialLinks.find((item) => {
            const key = toSocialKey(item?.icon || item?.title);
            return key.includes('facebook');
        });
        return String(facebookItem?.url || '').trim();
    }, [footerSocialLinks]);

    const fbEmbedUrl = useMemo(() => {
        if (!facebookLink) return '';
        const href = encodeURIComponent(facebookLink);
        return `https://www.facebook.com/plugins/page.php?href=${href}&tabs=timeline&width=100&height=100&small_header=true&adapt_container_width=false&hide_cover=true&show_facepile=false`;
    }, [facebookLink]);

    const supportPhone = String(contact?.hotline || setting?.hotline || '').trim();
    const supportEmail = String(contact?.email || '').trim();
    const phoneDigits = (contact?.phone || supportPhone) ? String(contact?.phone || supportPhone).replace(/\D/g, '') : '';
    const whatsappLink = process.env.NEXT_PUBLIC_MESSENGER_URL || (phoneDigits ? `https://wa.me/${phoneDigits}` : '#');
    const footerPaymentEnabled = Number(setting?.footer_payment_enabled ?? 1) === 1;

    const renderPageLink = (page) => {
        const label = String(page?.name || page?.title || '').trim();
        const slug = String(page?.slug || '').trim();
        if (!label) return null;

        return slug
            ? <Link to={`/page/${slug}`}>{label}</Link>
            : <span>{label}</span>;
    };

    return (
        <footer style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <div className="theme-footer-surface border-t border-gray-500">
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
                            <div className="mt-4 max-w-[360px] rounded-2xl border border-[#dbe4eb] bg-white px-4 py-4 text-[#3f4a59] shadow-sm">
                                <div className="mb-3 flex items-center gap-3 border-b border-[#e8eef3] pb-3">
                                    <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#d5e2ee] bg-[#f1f7fd]">
                                        {isSettingsLoading ? (
                                            <span className="h-6 w-6 animate-pulse rounded-full bg-gray-200" />
                                        ) : logoSrc ? (
                                            <img src={logoSrc} alt={siteName} className="h-8 w-8 object-contain" />
                                        ) : (
                                            <span className="text-sm font-bold text-[#2c3f4f]">{siteName.slice(0, 1)}</span>
                                        )}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-base font-extrabold tracking-tight text-[#2c3f4f]">{siteName}</p>
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f9f90]">Customer Care</p>
                                    </div>
                                </div>

                                <p className="text-[16px] font-medium leading-[1.45] text-[#3f4a59]">
                                    {contact?.address || 'Address not set'}
                                </p>

                                <p className="mt-3 text-[16px] leading-[1.45] text-[#3f4a59]">
                                    <span className="font-semibold text-[#2f3b49]">E-mail: </span>
                                    {supportEmail ? (
                                        <a href={`mailto:${supportEmail}`} className="font-medium text-[#3f4a59] hover:text-[#2f9f90]">
                                            {supportEmail}
                                        </a>
                                    ) : (
                                        'Not available'
                                    )}
                                </p>

                                <p className="mt-2 text-[16px] leading-[1.45] text-[#3f4a59]">
                                    <span className="font-semibold text-[#2f3b49]">Hotline: </span>
                                    {supportPhone ? (
                                        <a href={`tel:${supportPhone}`} className="font-medium text-[#3f4a59] hover:text-[#2f9f90]">
                                            {supportPhone}
                                        </a>
                                    ) : (
                                        'Not available'
                                    )}
                                </p>
                            </div>
                            <h5 className="mt-4 text-sm font-bold">FOLLOW US ON:</h5>
                            <div className="mt-2 flex items-center gap-2">
                                {footerSocialLinks.map((link, index) => {
                                    const href = normalizeExternalUrl(link?.url);
                                    if (href === '#') return null;

                                    const Icon = resolveSocialIcon(link?.icon || link?.title);
                                    const title = String(link?.title || 'Social link').trim() || 'Social link';

                                    return (
                                        <a
                                            key={link?.id || `${title}-${index}`}
                                            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white"
                                            href={href}
                                            title={title}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Icon size={14} />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="text-sm">
                            <p className="mb-3 font-semibold">Useful Links</p>
                            <ul className="space-y-2 text-gray-700">
                                {footerUsefulLinks.length > 0 ? footerUsefulLinks.map((page, index) => (
                                    <li key={page?.id || `${page?.slug || page?.name || 'useful'}-${index}`}>
                                        {renderPageLink(page)}
                                    </li>
                                )) : (
                                    <li className="text-gray-500">No links configured</li>
                                )}
                            </ul>
                        </div>

                        <div className="text-sm">
                            <p className="mb-3 font-semibold">References</p>
                            <ul className="space-y-2 text-gray-700">
                                {footerReferenceLinks.length > 0 ? footerReferenceLinks.map((page, index) => (
                                    <li key={page?.id || `${page?.slug || page?.name || 'reference'}-${index}`}>
                                        {renderPageLink(page)}
                                    </li>
                                )) : (
                                    <li className="text-gray-500">No links configured</li>
                                )}
                            </ul>
                        </div>

                        <div className="flex items-center justify-center">
                            {facebookLink ? (
                                <div className="flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
                                    {fbEmbedUrl ? (
                                        <iframe
                                            title="Facebook Page"
                                            src={fbEmbedUrl}
                                            width="100"
                                            height="100"
                                            style={{ border: 'none', overflow: 'hidden' }}
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
                                            title="Facebook"
                                        >
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

                <div className="theme-footer-bar border-t border-black/10 py-4">
                    <div className="container mx-auto px-4">
                        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-700">
                            <span>{new Date().getFullYear()}</span> | Powered by
                            <a href="https://freelancerbangladesh.com/" target="_blank" rel="noopener noreferrer">
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

            <div className="theme-footer-surface fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 md:hidden">
                <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2 text-xs text-gray-700">
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-menu'))}
                        className="flex flex-col items-center gap-1"
                    >
                        <FaBars />
                        <span>Categories</span>
                    </button>
                    <a href={whatsappLink} className="flex flex-col items-center gap-1">
                        <FaCommentDots />
                        <span>Message</span>
                    </a>
                    <Link to="/" className="flex flex-col items-center gap-1">
                        <FaHome />
                        <span>Home</span>
                    </Link>
                    <Link to="/cart" className="flex flex-col items-center gap-1">
                        <FaShoppingCart />
                        <span>Cart ({count})</span>
                    </Link>
                    <Link to={user ? '/account' : '/login'} className="flex flex-col items-center gap-1">
                        <FaUser />
                        <span>{user ? 'Account' : 'Login'}</span>
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
