'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PremiumLoader from './PremiumLoader';

const ROUTE_LOADER_MIN_VISIBLE_MS = 520;

const RouteTransitionLoader = ({ variant = 'auto' }) => {
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const hideTimerRef = useRef(null);
    const routeKeyRef = useRef(`${location.pathname}${location.search}${location.hash}`);

    useEffect(() => {
        return () => {
            if (hideTimerRef.current) {
                window.clearTimeout(hideTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const nextRouteKey = `${location.pathname}${location.search}${location.hash}`;
        if (routeKeyRef.current === nextRouteKey) {
            return;
        }

        routeKeyRef.current = nextRouteKey;
        setIsVisible(true);

        if (hideTimerRef.current) {
            window.clearTimeout(hideTimerRef.current);
        }

        hideTimerRef.current = window.setTimeout(() => {
            setIsVisible(false);
        }, ROUTE_LOADER_MIN_VISIBLE_MS);
    }, [location.pathname, location.search, location.hash]);

    if (!isVisible) {
        return null;
    }

    return (
        <PremiumLoader
            variant={variant}
            label="Loading new page"
            subLabel="Optimizing your experience"
        />
    );
};

export default RouteTransitionLoader;
