
import React, { useEffect, useRef } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'default' | 'full'; // Added size prop
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'default' }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        triggerRef.current = document.activeElement as HTMLElement;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const trapFocus = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || !modalRef.current) return;
            
            const focusableElements = Array.from(
                modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
            ).filter((el): el is HTMLElement => 
                el instanceof HTMLElement && el.offsetParent !== null
            );
            
            if(focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    event.preventDefault();
                }
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        const currentModal = modalRef.current;
        currentModal?.addEventListener('keydown', trapFocus);

        setTimeout(() => {
            currentModal?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )?.focus();
        }, 100);


        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            currentModal?.removeEventListener('keydown', trapFocus);
            if (triggerRef.current && document.body.contains(triggerRef.current)) {
                triggerRef.current.focus();
            }
        };
    }, [isOpen, onClose]);


    if (!isOpen) return null;

    // Determine classes based on size prop
    const containerClasses = size === 'full'
        ? 'bg-white dark:bg-slate-800 w-full h-full flex flex-col hc-bg-override hc-border-override'
        : 'bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg hc-bg-override hc-border-override';

    const wrapperClasses = size === 'full'
        ? 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center' // Removed padding for full screen
        : 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4';

    return (
        <div 
            className={wrapperClasses}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                ref={modalRef}
                className={containerClasses}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b dark:border-slate-700 p-4 hc-border-override flex-shrink-0">
                    <h3 id="modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100 hc-text-primary">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 p-3 -mr-2 -mt-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" 
                        aria-label="Fechar modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className={`p-6 ${size === 'full' ? 'overflow-y-auto flex-1 max-w-5xl mx-auto w-full' : ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
