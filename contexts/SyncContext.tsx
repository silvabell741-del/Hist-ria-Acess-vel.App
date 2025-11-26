
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';
import type { OfflineAction, OfflineActionType } from '../types';
import { executeSubmitActivity, executeGradeActivity, executePostNotice } from '../utils/offlineActions';
import { useToast } from './ToastContext';

const QUEUE_KEY = 'offline_action_queue';

interface SyncContextType {
    pendingCount: number;
    isSyncing: boolean;
    isOnline: boolean;
    addOfflineAction: (type: OfflineActionType, payload: any) => Promise<void>;
    syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children?: React.ReactNode }) {
    const [queue, setQueue] = useState<OfflineAction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { addToast } = useToast();

    // 1. Load Queue on Mount
    useEffect(() => {
        const loadQueue = async () => {
            const stored = await get<OfflineAction[]>(QUEUE_KEY);
            if (stored) setQueue(stored);
        };
        loadQueue();
    }, []);

    // 2. Monitor Online Status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Attempt sync when back online
            syncNow();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []); // Dependencies handled inside syncNow ref if needed

    // 3. Add Action to Queue (Persisted)
    const addOfflineAction = useCallback(async (type: OfflineActionType, payload: any) => {
        const newAction: OfflineAction = {
            id: crypto.randomUUID(),
            type,
            payload,
            timestamp: Date.now()
        };

        const updatedQueue = [...queue, newAction];
        setQueue(updatedQueue);
        await set(QUEUE_KEY, updatedQueue);
    }, [queue]);

    // 4. Process Queue
    const syncNow = async () => {
        const storedQueue = await get<OfflineAction[]>(QUEUE_KEY);
        if (!storedQueue || storedQueue.length === 0) return;

        setIsSyncing(true);
        let successCount = 0;
        const failedActions: OfflineAction[] = [];

        // Process sequentially to maintain order
        for (const action of storedQueue) {
            try {
                switch (action.type) {
                    case 'SUBMIT_ACTIVITY':
                        await executeSubmitActivity(action.payload);
                        break;
                    case 'GRADE_ACTIVITY':
                        await executeGradeActivity(action.payload);
                        break;
                    case 'POST_NOTICE':
                        await executePostNotice(action.payload);
                        break;
                }
                successCount++;
            } catch (error) {
                console.error(`Failed to sync action ${action.type}:`, error);
                // Keep failed actions to retry later (maybe add retry count in future)
                failedActions.push(action);
            }
        }

        // Update Queue
        setQueue(failedActions);
        await set(QUEUE_KEY, failedActions);
        setIsSyncing(false);

        if (successCount > 0) {
            addToast(`${successCount} itens sincronizados com sucesso!`, 'success');
        }
        if (failedActions.length > 0) {
            addToast(`${failedActions.length} itens falharam. Tentaremos novamente mais tarde.`, 'error');
        }
    };

    return (
        <SyncContext.Provider value={{ 
            pendingCount: queue.length, 
            isSyncing, 
            isOnline,
            addOfflineAction, 
            syncNow 
        }}>
            {children}
        </SyncContext.Provider>
    );
}

export const useSync = () => {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
