'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const FRONTEND_DEFAULTS = {
    primary: '#111827',
    secondary: '#374151',
    accent: '#10b981',
    ink: '#0b0f19',
    muted: '#667085',
    line: '#e5e7eb',
    surface: '#ffffff',
    surfaceAlt: '#f8fafc',
};

const ADMIN_DEFAULTS = {
    primary: '#28c76f',
    secondary: '#00cfe8',
    accent: '#7367f0',
    ink: '#1f2937',
    muted: '#6b7280',
    line: '#d1d5db',
    surface: '#ffffff',
    surfaceAlt: '#f8fafc',
};

const normalizeHex = (value, fallback) => {
    const raw = String(value || '').trim();
    if (!HEX_COLOR_PATTERN.test(raw)) {
        return fallback;
    }

    if (raw.length === 4) {
        return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
    }

    return raw.toLowerCase();
};

const hexToRgb = (hex) => {
    const normalized = normalizeHex(hex, '#000000');
    const value = normalized.slice(1);

    return {
        r: Number.parseInt(value.slice(0, 2), 16),
        g: Number.parseInt(value.slice(2, 4), 16),
        b: Number.parseInt(value.slice(4, 6), 16),
    };
};

const withAlpha = (hex, alpha) => {
    const { r, g, b } = hexToRgb(hex);
    const bounded = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${bounded})`;
};

const resolveFrontendPalette = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return FRONTEND_DEFAULTS;
    }

    const rootStyles = window.getComputedStyle(document.documentElement);

    return {
        primary: normalizeHex(rootStyles.getPropertyValue('--frontend-btn-primary'), FRONTEND_DEFAULTS.primary),
        secondary: normalizeHex(rootStyles.getPropertyValue('--frontend-btn-secondary'), FRONTEND_DEFAULTS.secondary),
        accent: normalizeHex(rootStyles.getPropertyValue('--accent'), FRONTEND_DEFAULTS.accent),
        ink: normalizeHex(rootStyles.getPropertyValue('--ink'), FRONTEND_DEFAULTS.ink),
        muted: normalizeHex(rootStyles.getPropertyValue('--muted'), FRONTEND_DEFAULTS.muted),
        line: normalizeHex(rootStyles.getPropertyValue('--line'), FRONTEND_DEFAULTS.line),
        surface: normalizeHex(rootStyles.getPropertyValue('--surface'), FRONTEND_DEFAULTS.surface),
        surfaceAlt: normalizeHex(rootStyles.getPropertyValue('--surface-2'), FRONTEND_DEFAULTS.surfaceAlt),
    };
};

const resolveThemePalette = (variant) => {
    if (variant === 'frontend') {
        return resolveFrontendPalette();
    }

    if (variant === 'admin') {
        return ADMIN_DEFAULTS;
    }

    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        return ADMIN_DEFAULTS;
    }

    return resolveFrontendPalette();
};

const PremiumLoader = ({
    fullScreen = true,
    label = 'Loading page',
    subLabel = 'Please wait while we prepare everything',
    variant = 'auto',
    className,
}) => {
    const palette = useMemo(() => resolveThemePalette(variant), [variant]);

    const wrapperStyle = useMemo(() => {
        if (fullScreen) {
            return {
                background: `radial-gradient(circle at 14% 18%, ${withAlpha(palette.primary, 0.17)} 0%, ${withAlpha(palette.secondary, 0.14)} 24%, ${withAlpha(palette.surfaceAlt, 0.96)} 58%, ${withAlpha(palette.surface, 0.98)} 100%)`,
            };
        }

        return {
            background: `linear-gradient(180deg, ${withAlpha(palette.surface, 0.9)} 0%, ${withAlpha(palette.surfaceAlt, 0.95)} 100%)`,
        };
    }, [fullScreen, palette]);

    const cardStyle = useMemo(() => ({
        borderColor: withAlpha(palette.line, 0.95),
        background: `linear-gradient(145deg, ${palette.surface} 0%, ${palette.surface} 52%, ${palette.surfaceAlt} 100%)`,
        boxShadow: `0 24px 64px ${withAlpha(palette.ink, 0.16)}`,
    }), [palette]);

    const badgeStyle = useMemo(() => ({
        borderColor: withAlpha(palette.primary, 0.2),
        color: palette.primary,
        backgroundColor: withAlpha(palette.primary, 0.08),
    }), [palette]);

    const spinnerOuterStyle = useMemo(() => ({
        borderColor: withAlpha(palette.line, 0.9),
        borderTopColor: palette.primary,
        borderRightColor: palette.secondary,
    }), [palette]);

    const spinnerInnerStyle = useMemo(() => ({
        borderColor: withAlpha(palette.secondary, 0.3),
        borderBottomColor: palette.primary,
    }), [palette]);

    const spinnerCoreStyle = useMemo(() => ({
        background: `linear-gradient(135deg, ${palette.secondary} 0%, ${palette.accent} 45%, ${palette.primary} 100%)`,
        boxShadow: `0 0 0 8px ${withAlpha(palette.primary, 0.1)}`,
    }), [palette]);

    const progressTrackStyle = useMemo(() => ({
        backgroundColor: withAlpha(palette.line, 0.8),
    }), [palette]);

    const progressBarStyle = useMemo(() => ({
        background: `linear-gradient(90deg, ${palette.secondary} 0%, ${palette.accent} 50%, ${palette.primary} 100%)`,
    }), [palette]);

    return (
        <div
            className={clsx(
                'flex items-center justify-center',
                fullScreen
                    ? 'fixed inset-0 z-[1200] backdrop-blur-[2px]'
                    : 'min-h-[45vh] w-full',
                className
            )}
            style={wrapperStyle}
            role="status"
            aria-label={label}
            aria-live="polite"
            aria-busy="true"
        >
            <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-3xl border p-6 sm:p-7"
                style={cardStyle}
            >
                <motion.div
                    className="pointer-events-none absolute -top-16 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full blur-2xl"
                    style={{ backgroundColor: withAlpha(palette.primary, 0.22) }}
                    animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.5, 0.85, 0.5] }}
                    transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="relative flex min-w-[260px] items-center gap-4 sm:min-w-[320px]">
                    <div className="relative h-14 w-14 shrink-0">
                        <motion.span
                            className="absolute inset-0 rounded-full border-[3px]"
                            style={spinnerOuterStyle}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
                        />
                        <motion.span
                            className="absolute inset-2 rounded-full border-[2px]"
                            style={spinnerInnerStyle}
                            animate={{ rotate: -360 }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                        />
                        <motion.span
                            className="absolute inset-[18px] rounded-full"
                            style={spinnerCoreStyle}
                            animate={{ scale: [1, 1.14, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    </div>

                    <div className="w-full">
                        <p
                            className="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={badgeStyle}
                        >
                            please wait
                        </p>
                        <h3 className="mt-2 text-base font-semibold sm:text-lg" style={{ color: palette.ink }}>{label}</h3>
                        <p className="mt-1 text-xs sm:text-sm" style={{ color: palette.muted }}>{subLabel}</p>

                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={progressTrackStyle}>
                            <motion.span
                                className="block h-full w-1/2 rounded-full"
                                style={progressBarStyle}
                                animate={{ x: ['-120%', '220%'] }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PremiumLoader;
