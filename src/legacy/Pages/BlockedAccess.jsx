import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiRefreshCw, FiShield } from 'react-icons/fi';

const BlockedAccess = () => {
    const location = useLocation();

    const { reason, ip } = useMemo(() => {
        const params = new URLSearchParams(location.search);

        return {
            reason: (params.get('reason') || '').trim(),
            ip: (params.get('ip') || '').trim(),
        };
    }, [location.search]);

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
            <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-rose-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 bottom-12 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%)]" />

            <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-8">
                <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-200/20 bg-rose-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                        <FiShield className="h-4 w-4" />
                        Access Blocked
                    </div>

                    <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
                        This IP Address Is Restricted
                    </h1>
                    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">
                        We are unable to grant access from your current network at this time. If you think this is a mistake, contact support and share your details.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4">
                            <p className="text-xs uppercase tracking-widest text-slate-400">Detected IP</p>
                            <p className="mt-2 font-mono text-sm text-amber-200">{ip || 'Unavailable'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4">
                            <p className="text-xs uppercase tracking-widest text-slate-400">Reason</p>
                            <p className="mt-2 text-sm text-slate-100">{reason || 'Security policy restriction from admin panel.'}</p>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:brightness-110"
                        >
                            <FiRefreshCw className="h-4 w-4" />
                            Try Again
                        </button>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                        >
                            <FiArrowLeft className="h-4 w-4" />
                            Back To Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlockedAccess;
