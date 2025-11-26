
import React, { useState, useEffect } from 'react';
import { useSync } from '../../contexts/SyncContext';

export const OfflineIndicator: React.FC = () => {
    const [showBackOnline, setShowBackOnline] = useState(false);
    // Try/Catch to allow using this component outside of SyncContext (e.g. Login page)
    let syncData = { isOnline: navigator.onLine, pendingCount: 0, isSyncing: false };
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        syncData = useSync();
    } catch {
        // Fallback for when context is not available (Login Page)
    }
    
    const { isOnline, pendingCount, isSyncing } = syncData;

    useEffect(() => {
        const handleOnline = () => {
            setShowBackOnline(true);
            const timer = setTimeout(() => setShowBackOnline(false), 4000); // Exibe por 4 segundos
            return () => clearTimeout(timer);
        };

        const handleOffline = () => {
            setShowBackOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOnline) {
        return (
            <div 
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[100] bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-600 flex items-center justify-between animate-fade-in"
                role="alert"
                aria-live="assertive"
            >
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                    </svg>
                    <div>
                        <p className="font-bold text-sm">Você está offline</p>
                        <p className="text-xs text-slate-300">
                            {pendingCount > 0 
                                ? `${pendingCount} ação(ões) salva(s) para envio.` 
                                : "Funcionalidades limitadas."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div 
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[100] bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg border border-blue-500 flex items-center justify-between animate-fade-in"
                role="status"
                aria-live="polite"
            >
                <div className="flex items-center">
                    <svg className="animate-spin h-5 w-5 text-white mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div>
                        <p className="font-bold text-sm">Sincronizando...</p>
                        <p className="text-xs text-blue-100">Enviando {pendingCount} pendências.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (showBackOnline) {
        return (
            <div 
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[100] bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg border border-green-500 flex items-center justify-between animate-fade-in"
                role="status"
                aria-live="polite"
            >
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                        <p className="font-bold text-sm">Conexão restaurada</p>
                        <p className="text-xs text-green-100">Você está online novamente.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowBackOnline(false)}
                    className="ml-4 text-green-200 hover:text-white"
                    aria-label="Fechar notificação"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        );
    }

    return null;
};
