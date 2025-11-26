
import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import { Toast } from '../components/common/Toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// FIX: Refactored the provider component to a standard function declaration to resolve errors where the 'children' prop was not being correctly recognized by the type system.
export function ToastProvider({ children }: { children?: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div
                aria-live="polite"
                aria-atomic="true"
                className="fixed inset-0 pointer-events-none p-4 sm:p-6 flex flex-col items-end z-[100]"
            >
                <div className="w-full max-w-sm space-y-4">
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            message={toast.message}
                            type={toast.type}
                            onDismiss={() => removeToast(toast.id)}
                        />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};