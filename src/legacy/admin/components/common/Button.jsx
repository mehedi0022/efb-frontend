import React from 'react';
import clsx from 'clsx';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    rounded = 'full',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    ...props
}) => {
    const variants = {
        primary: 'bg-admin-primary hover:bg-admin-primary/90 text-white',
        secondary: 'bg-admin-secondary hover:bg-admin-secondary/90 text-white',
        accent: 'bg-admin-accent hover:bg-admin-accent/90 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        success: 'bg-green-600 hover:bg-green-700 text-white',
        warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        info: 'bg-blue-500 hover:bg-blue-600 text-white',
        outline: 'border-2 border-admin-primary text-admin-primary hover:bg-admin-primary hover:text-white',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    const roundedClasses = {
        none: 'rounded-none',
        sm: 'rounded',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
    };

    return (
        <button
            className={clsx(
                'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                variants[variant],
                sizes[size],
                roundedClasses[rounded],
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {Icon && iconPosition === 'left' && !loading && <Icon className="text-lg" />}
            {children}
            {Icon && iconPosition === 'right' && !loading && <Icon className="text-lg" />}
        </button>
    );
};

export default Button;
