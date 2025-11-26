
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md border border-slate-200/70 dark:border-slate-700 dark:shadow-none p-4 sm:p-6 transition-all duration-200 hc-bg-override hc-border-override ${className}`}>
            {children}
        </div>
    );
};