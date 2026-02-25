import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiHome, FiPhoneCall } from 'react-icons/fi';
import { useSettings } from '../context/SettingsContext';
import { useSiteData } from '../context/SiteDataContext';

const FALLBACK_HOTLINE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '01700-000000';

const toDigits = (value) => String(value || '').replace(/\D/g, '');

const pickFirstValue = (...candidates) => {
    for (const candidate of candidates) {
        const value = String(candidate || '').trim();
        if (value) return value;
    }
    return '';
};

const OrderSuccess = () => {
    const { setting } = useSettings();
    const { contact } = useSiteData();

    const hotlineNumber = useMemo(
        () => pickFirstValue(
            contact?.hotline,
            contact?.phone,
            setting?.hotline,
            setting?.phone,
            FALLBACK_HOTLINE
        ),
        [contact?.hotline, contact?.phone, setting?.hotline, setting?.phone]
    );
    const hotlineHref = toDigits(hotlineNumber) ? `tel:${toDigits(hotlineNumber)}` : '#';

    return (
        <div className="min-h-[65vh] bg-[#edf1f7] px-4 py-10 md:py-14">
            <div className="mx-auto w-full max-w-2xl rounded-[28px] border border-[#d7dee9] bg-white p-6 text-center shadow-[0_16px_50px_rgba(15,23,42,0.12)] md:p-10">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#ecfdf3] ring-8 ring-[#f4fdf8]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dcfce7]">
                        <FiCheckCircle className="h-10 w-10 text-[#15803d]" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-[#111827] md:text-4xl">Order Successful!</h2>

                <div className="mt-5 space-y-3 rounded-2xl border border-[#d7e6ff] bg-gradient-to-br from-[#f8fbff] to-[#eef5ff] px-4 py-5 text-left text-[15px] leading-relaxed text-[#1f2937] md:px-6">
                    <p>Your order has been successfully received.</p>
                    <p>
                        One of our representatives will contact you shortly at:{' '}
                        <a
                            href={hotlineHref}
                            className="inline-flex items-center gap-1.5 font-bold text-[#1d4ed8] hover:text-[#1e40af]"
                        >
                            <FiPhoneCall className="text-sm" />
                            {hotlineNumber}
                        </a>
                    </p>
                    <p>Please wait a moment for our call. Thank you.</p>
                </div>

                <div className="mt-7">
                    <Link
                        to="/"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#111827] bg-[#111827] px-6 py-3 font-semibold text-white transition hover:bg-[#1f2937] md:w-auto"
                    >
                        <FiHome />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
