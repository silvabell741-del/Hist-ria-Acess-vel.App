
import React, { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onDismiss: () => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
    success: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    error: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    info: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

const BORDER_COLORS: Record<ToastType, string> = {
    success: 'border-green-200 dark:border-green-700',
    error: 'border-red-200 dark:border-red-700',
    info: 'border-blue-200 dark:border-blue-700',
};

const BG_COLORS: Record<ToastType, string> = {
    success: 'bg-green-50/90 dark:bg-green-900/90',
    error: 'bg-red-50/90 dark:bg-red-900/90',
    info: 'bg-blue-50/90 dark:bg-blue-900/90',
};

export const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onDismiss, 300); // Allow time for exit animation
        }, 5000); // 5 seconds

        return () => clearTimeout(timer);
    }, [onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    };

    const enterAnimation = 'animate-[toast-in_0.3s_ease-out_forwards]';
    const exitAnimation = 'animate-[toast-out_0.3s_ease-in_forwards]';

    // Accessibility: Errors should be assertive alerts, others should be polite status updates
    const role = type === 'error' ? 'alert' : 'status';
    const ariaLive = type === 'error' ? 'assertive' : 'polite';

    return (
        <div
            role={role}
            aria-live={ariaLive}
            className={`w-full max-w-sm rounded-lg shadow-lg backdrop-blur-md border ${BORDER_COLORS[type]} ${BG_COLORS[type]} ${isExiting ? exitAnimation : enterAnimation}`}
        >
            <div className="flex items-start p-4">
                <div className="flex-shrink-0">{ICONS[type]}</div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 hc-text-override">{message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        onClick={handleDismiss}
                        className="inline-flex rounded-md text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        aria-label="Fechar notificação"
                    >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes toast-in {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes toast-out {
                    from { opacity: 1; transform: translateX(0); }
                    to { opacity: 0; transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};
