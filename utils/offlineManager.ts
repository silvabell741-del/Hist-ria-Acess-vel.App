import { set, get, del, keys } from 'idb-keyval';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import type { Module, ModulePage } from '../types';

const OFFLINE_PREFIX = 'offline_module_';
const CACHE_NAME = 'offline-media-v1';

export interface OfflineModuleData {
    module: Module;
    pages: ModulePage[];
    savedAt: number;
}

// Helper: Extract image URLs from module pages
const extractImageUrls = (pages: ModulePage[]): string[] => {
    const urls: string[] = [];
    pages.forEach(page => {
        page.content.forEach(block => {
            if (block.type === 'image' && typeof block.content === 'string' && block.content.startsWith('http')) {
                urls.push(block.content);
            }
        });
    });
    return urls;
};

/**
 * Saves a module and its content for offline use.
 * 1. Fetches metadata and content from Firestore.
 * 2. Caches images in Cache Storage.
 * 3. Saves structure in IndexedDB.
 */
export const saveModuleOffline = async (module: Module): Promise<void> => {
    try {
        // 1. Fetch full content from Firestore (Split Pattern)
        // Even if we have 'module.pages' locally, we fetch fresh to ensure completeness
        const contentRef = doc(db, 'module_contents', module.id);
        const contentSnap = await getDoc(contentRef);
        
        let pages: ModulePage[] = [];
        
        if (contentSnap.exists()) {
            pages = contentSnap.data().pages as ModulePage[];
        } else if (module.pages && module.pages.length > 0) {
            // Fallback to nested pages if available
            pages = module.pages;
        } else {
            throw new Error("Conteúdo do módulo não encontrado.");
        }

        // 2. Cache Images (Cache Storage API)
        const cache = await caches.open(CACHE_NAME);
        const imageUrls = extractImageUrls(pages);
        
        // Add cover image if it exists
        if (module.coverImageUrl && module.coverImageUrl.startsWith('http')) {
            imageUrls.push(module.coverImageUrl);
        }

        // Fetch and cache images in parallel
        const imagePromises = imageUrls.map(async (url) => {
            try {
                // 'no-cors' allows opaque responses (like from Firebase Storage/Google User Content)
                // Note: Opaque responses can be cached but not read by JS, which is fine for <img> tags.
                const response = await fetch(url, { mode: 'cors' }); 
                if (response.ok) {
                    await cache.put(url, response);
                }
            } catch (e) {
                console.warn(`[Offline] Failed to cache image: ${url}`, e);
            }
        });
        
        await Promise.all(imagePromises);

        // 3. Save Data to IndexedDB
        const offlineData: OfflineModuleData = {
            module: { ...module, downloadState: 'downloaded' }, // Update local state hint
            pages,
            savedAt: Date.now()
        };

        await set(`${OFFLINE_PREFIX}${module.id}`, offlineData);
        console.log(`[Offline] Module ${module.id} saved successfully.`);

    } catch (error) {
        console.error("[Offline] Error saving module:", error);
        throw error;
    }
};

/**
 * Retrieves a module from IndexedDB.
 */
export const getOfflineModule = async (moduleId: string): Promise<OfflineModuleData | null> => {
    try {
        const data = await get<OfflineModuleData>(`${OFFLINE_PREFIX}${moduleId}`);
        return data || null;
    } catch (error) {
        console.error("[Offline] Error retrieving module:", error);
        return null;
    }
};

/**
 * Removes a module from offline storage.
 * Cleans up IndexedDB and attempts to remove specific images from cache (optional, strict cleanup).
 */
export const removeModuleOffline = async (moduleId: string): Promise<void> => {
    try {
        // Get data first to identify images to remove (Advanced cleanup)
        const data = await getOfflineModule(moduleId);
        
        // Delete from IDB
        await del(`${OFFLINE_PREFIX}${moduleId}`);

        // Cleanup Images from Cache (Optional but good for space)
        if (data) {
            const cache = await caches.open(CACHE_NAME);
            const imageUrls = extractImageUrls(data.pages);
            if (data.module.coverImageUrl) imageUrls.push(data.module.coverImageUrl);

            // Note: In a shared cache scenario, deleting images might affect other modules using the same image.
            // For simplicity in Phase 1, we might skip aggressive image deletion or implement reference counting later.
            // Here we leave images in cache as they are LRU managed by browser or Workbox generally.
        }
        
        console.log(`[Offline] Module ${moduleId} removed.`);
    } catch (error) {
        console.error("[Offline] Error removing module:", error);
        throw error;
    }
};

/**
 * Checks if a module is currently saved offline.
 */
export const isModuleOffline = async (moduleId: string): Promise<boolean> => {
    const keysArray = await keys();
    return keysArray.includes(`${OFFLINE_PREFIX}${moduleId}`);
};

/**
 * Lists all offline modules.
 */
export const listOfflineModules = async (): Promise<Module[]> => {
    const keysArray = await keys();
    const moduleKeys = keysArray.filter(k => typeof k === 'string' && k.startsWith(OFFLINE_PREFIX));
    
    const modules: Module[] = [];
    for (const k of moduleKeys) {
        const data = await get<OfflineModuleData>(k);
        if (data) modules.push(data.module);
    }
    return modules;
};
