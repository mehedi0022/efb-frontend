import React from 'react';
import clsx from 'clsx';
import { getStatusColor } from '../../utils/helpers';

const Badge = ({
    children,
    variant = 'default',
    color,
    className = ''
}) => {
    const variants = {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-admin-primary/10 text-admin-primary',
        secondary: 'bg-admin-secondary/10 text-admin-secondary',
        success: 'bg-green-100 text-green-800',
        danger: 'bg-red-100 text-red-800',
        warning: 'bg-yellow-100 text-yellow-800',
        info: 'bg-blue-100 text-blue-800',
    };

    const badgeColor = color || variants[variant];

    return (
        <span className={clsx(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            badgeColor,
            className
        )}>
            {children}
        </span>
    );
};

export default Badge;
