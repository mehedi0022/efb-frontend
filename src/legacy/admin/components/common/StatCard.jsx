import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    bgColor = 'bg-admin-primary',
    iconBgColor = 'bg-white',
    iconColor = 'text-admin-primary',
    valueColor = 'text-white',
    titleColor = 'text-white',
    subtitleColor = 'text-white'
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="widget-rounded-circle"
        >
            <div className={clsx('rounded-lg shadow-card p-6', bgColor)}>
                <div className="flex items-center justify-between">
                    {/* Icon Section */}
                    <div className={clsx(
                        'w-16 h-16 rounded-full flex items-center justify-center border-2',
                        iconBgColor
                    )}>
                        <Icon className={clsx('text-2xl', iconColor)} />
                    </div>

                    {/* Stats Section */}
                    <div className="text-right flex-1 ml-4">
                        <h3 className={clsx('text-3xl font-bold mb-1', valueColor)}>
                            {value}
                        </h3>
                        <p className={clsx('text-base font-bold mb-1', titleColor)}>
                            {title}
                        </p>
                        {subtitle && (
                            <small className={clsx('text-sm font-bold block', subtitleColor)}>
                                {subtitle}
                            </small>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default StatCard;
