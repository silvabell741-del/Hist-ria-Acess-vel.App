
import React, { createContext, useState, useCallback, useMemo, useEffect, useContext, ReactNode } from 'react';
import type { Module, Quiz, Achievement } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { db } from '../components/firebaseClient';
import { 
    collection, getDocs, deleteDoc, doc, addDoc, updateDoc, 
    writeBatch, serverTimestamp, query, orderBy, setDoc, 
    limit, startAfter, getCountFromServer, QueryDocumentSnapshot 
} from 'firebase/firestore';
import { useCachedQuery } from '../hooks/useCachedQuery';

export interface AdminDataContextType {
    modules: Module[];
    totalModulesCount: number; // Nova propriedade para estatísticas reais
    quizzes: Quiz[];
    achievements: Achievement[];
    
    isLoading: boolean;
    isLoadingModules: boolean; // Loading específico da paginação
    hasMoreModules: boolean; // Se tem mais páginas
    
    isSubmitting: boolean;
    isOffline: boolean;
    
    handleDeleteAllModules: () => Promise<void>;
    handleDeleteModule: (moduleId: string) => Promise<void>;
    handleBulkDeleteModules: (moduleIds: Set<string>) => Promise<void>;
    
    handleSaveQuiz: (newQuizData: Omit<Quiz, 'id'>) => Promise<void>;
    handleUpdateQuiz: (updatedQuiz: Quiz) => Promise<void>;
    handleDeleteQuiz: (quizId: string) => Promise<void>;
    
    handleSaveAchievement: (newAchievementData: Omit<Achievement, 'id'>) => Promise<void>;
    handleUpdateAchievement: (updatedAchievement: Achievement) => Promise<void>;
    handleDeleteAchievement: (achievementId: string) => Promise<void>;
    
    handleSaveModule: (newModule: Omit<Module, 'id'>) => Promise<boolean>;
    handleUpdateModule: (updatedModule: Module) => Promise<void>;
    
    fetchData: () => Promise<void>;
    fetchNextModulesPage: () => Promise<void>; // Função para carregar próxima página
}

export const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

const MODULES_PER_PAGE = 20;

export function AdminDataProvider({ children }: { children?: ReactNode }) {
    const { user } = useAuth();
    const { addToast } = useToast();

    // Async states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    // --- PAGINATION STATE FOR MODULES ---
    const [modules, setModules] = useState<Module[]>([]);
    const [totalModulesCount, setTotalModulesCount] = useState(0);
    const [lastModuleDoc, setLastModuleDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMoreModules, setHasMoreModules] = useState(true);
    const [isLoadingModules, setIsLoadingModules] = useState(false);
    const [modulesLoaded, setModulesLoaded] = useState(false);

    // --- Cached Collections (Small datasets) ---
    const { data: quizzesData, loading: quizzesLoading, invalidate: invalidateQuizzes, error: quizzesError } = useCachedQuery('admin_quizzes', () => query(collection(db, 'quizzes'), orderBy('date', 'desc')), [user]);
    const { data: achievementsData, loading: achievementsLoading, invalidate: invalidateAchievements, error: achievementsError } = useCachedQuery('admin_achievements', () => query(collection(db, 'achievements')), [user]);

    const isLoading = quizzesLoading || achievementsLoading; // Modules loading is handled separately now
    const hasError = quizzesError || achievementsError;
    
    useEffect(() => {
        if (hasError) {
            addToast(`Falha ao carregar dados de admin: ${hasError.message}`, 'error');
            setIsOffline(true);
            console.error(hasError);
        } else {
            setIsOffline(false);
        }
    }, [hasError, addToast]);

    // Data Transformation
    const quizzes = useMemo(() => (quizzesData || []).map(d => ({ ...d, date: d.date?.toDate ? d.date.toDate().toLocaleDateString('pt-BR') : undefined }) as Quiz), [quizzesData]);
    const achievements = useMemo(() => (achievementsData || []) as Achievement[], [achievementsData]);
    
    // --- MODULES PAGINATION LOGIC ---

    const fetchModulesPage = useCallback(async (isInitial = false) => {
        if (isLoadingModules) return;
        setIsLoadingModules(true);

        try {
            // 1. Get Total Count (Only on initial load to save reads, or implement a refresh counter)
            if (isInitial) {
                const countSnap = await getCountFromServer(collection(db, 'modules'));
                setTotalModulesCount(countSnap.data().count);
            }

            // 2. Build Query
            let q = query(
                collection(db, 'modules'), 
                orderBy('date', 'desc'), 
                limit(MODULES_PER_PAGE)
            );

            if (!isInitial && lastModuleDoc) {
                q = query(q, startAfter(lastModuleDoc));
            }

            // 3. Execute Query
            const snapshot = await getDocs(q);
            
            const newModules = snapshot.docs.map(d => ({ 
                id: d.id, 
                ...d.data(),
                date: d.data().date?.toDate ? d.data().date.toDate().toLocaleDateString('pt-BR') : undefined 
            }) as Module);

            // 4. Update State
            if (isInitial) {
                setModules(newModules);
            } else {
                setModules(prev => [...prev, ...newModules]);
            }

            setLastModuleDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMoreModules(snapshot.docs.length === MODULES_PER_PAGE);
            setModulesLoaded(true);

        } catch (error: any) {
            console.error("Error fetching modules:", error);
            addToast("Erro ao carregar módulos.", "error");
        } finally {
            setIsLoadingModules(false);
        }
    }, [lastModuleDoc, isLoadingModules, addToast]);

    // Initial Load
    useEffect(() => {
        if (user && !modulesLoaded) {
            fetchModulesPage(true);
        }
    }, [user, modulesLoaded, fetchModulesPage]);

    const fetchNextModulesPage = async () => {
        if (hasMoreModules) {
            await fetchModulesPage(false);
        }
    };

    const refreshModules = async () => {
        setLastModuleDoc(null);
        setHasMoreModules(true);
        setModules([]); // Clear list
        await fetchModulesPage(true);
    };

    // --- General Fetch ---
    const fetchData = useCallback(async () => {
        invalidateQuizzes();
        invalidateAchievements();
        refreshModules();
    }, [invalidateQuizzes, invalidateAchievements]);
    
    // --- Module Operations ---

    // SPLIT PATTERN IMPLEMENTATION
    const handleSaveModule = useCallback(async (newModule: Omit<Module, 'id'>): Promise<boolean> => {
        setIsSubmitting(true);
         try {
            const { pages, ...metadata } = newModule;
            
            // 1. Save Metadata
            const docRef = await addDoc(collection(db, "modules"), { 
                ...metadata, 
                date: serverTimestamp(),
                pages: [] // Empty for metadata doc
            });

            // 2. Save Content
            await setDoc(doc(db, "module_contents", docRef.id), { pages });

            addToast('Módulo salvo com sucesso!', 'success');
            refreshModules(); // Reload list to show new item at top
            return true;
        } catch (error: any) {
            addToast(`Erro ao salvar módulo: ${error.message}`, 'error');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [addToast]);

    const handleUpdateModule = useCallback(async (updatedModule: Module) => {
        setIsSubmitting(true);
        try {
            const { id, pages, ...metadata } = updatedModule;
            const moduleRef = doc(db, "modules", id);
            
            // 1. Update Metadata
            await updateDoc(moduleRef, { ...metadata, pages: [] });
            
            // 2. Update Content
            if (pages) {
                await setDoc(doc(db, "module_contents", id), { pages }, { merge: true });
            }

            addToast('Módulo atualizado com sucesso!', 'success');
            // Optimistic Update
            setModules(prev => prev.map(m => m.id === id ? updatedModule : m));
        } catch (error: any) {
            addToast(`Erro ao atualizar módulo: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [addToast]);

    const handleDeleteModule = useCallback(async (moduleId: string) => {
        setIsSubmitting(true);
        try {
            // Delete metadata
            await deleteDoc(doc(db, "modules", moduleId));
            // Delete content
            await deleteDoc(doc(db, "module_contents", moduleId));

            addToast('Módulo excluído com sucesso!', 'success');
            // Local removal
            setModules(prev => prev.filter(m => m.id !== moduleId));
            setTotalModulesCount(prev => Math.max(0, prev - 1));
        } catch (e: any) { addToast(`Erro: ${e.message}`, 'error'); } 
        finally { setIsSubmitting(false); }
    }, [addToast]);

    const handleBulkDeleteModules = useCallback(async (moduleIds: Set<string>) => {
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            moduleIds.forEach(id => {
                batch.delete(doc(db, "modules", id));
                batch.delete(doc(db, "module_contents", id));
            });
            await batch.commit();
            addToast(`${moduleIds.size} módulos excluídos com sucesso!`, 'success');
            // Local removal
            setModules(prev => prev.filter(m => !moduleIds.has(m.id)));
            setTotalModulesCount(prev => Math.max(0, prev - moduleIds.size));
        } catch (e: any) { addToast(`Erro na exclusão em massa: ${e.message}`, 'error'); }
        finally { setIsSubmitting(false); }
    }, [addToast]);
    
    const handleDeleteAllModules = useCallback(async () => {
        setIsSubmitting(true);
        try {
            // Note: In a real large app, deleting via client query is bad practice (use cloud functions), 
            // but for this scope it fits the test requirement.
            const modulesQuery = query(collection(db, "modules"));
            const snapshot = await getDocs(modulesQuery);
            const batch = writeBatch(db);
            snapshot.docs.forEach(d => {
                batch.delete(d.ref);
                batch.delete(doc(db, "module_contents", d.id));
            });
            await batch.commit();
            addToast("Todos os módulos foram excluídos!", "success");
            setModules([]);
            setTotalModulesCount(0);
        } catch (e: any) { addToast(`Erro na exclusão total: ${e.message}`, 'error'); }
        finally { setIsSubmitting(false); }
    }, [addToast]);

    // --- Quiz Operations ---

    const handleSaveQuiz = useCallback(async (newQuizData: Omit<Quiz, 'id'>) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "quizzes"), { ...newQuizData, createdBy: user.email, date: serverTimestamp() });
            addToast('Quiz salvo com sucesso!', 'success');
            invalidateQuizzes();
        } catch (e: any) { addToast(`Erro ao salvar quiz: ${e.message}`, 'error'); }
        finally { setIsSubmitting(false); }
    }, [addToast, user, invalidateQuizzes]);

    const handleUpdateQuiz = useCallback(async (updatedQuiz: Quiz) => {
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, "quizzes", updatedQuiz.id), updatedQuiz as any);
            addToast('Quiz atualizado com sucesso!', 'success');
            invalidateQuizzes();
        } catch (e: any) { addToast(`Erro ao atualizar quiz: ${e.message}`, 'error'); }
        finally { setIsSubmitting(false); }
    }, [addToast, invalidateQuizzes]);

    const handleDeleteQuiz = useCallback(async (quizId: string) => {
        try {
            await deleteDoc(doc(db, "quizzes", quizId));
            addToast('Quiz excluído com sucesso!', 'success');
            invalidateQuizzes();
        } catch (e: any) { addToast(`Erro ao excluir quiz: ${e.message}`, 'error'); }
    }, [addToast, invalidateQuizzes]);

    // --- Achievement Operations ---

    const handleSaveAchievement = useCallback(async (newAchievementData: Omit<Achievement, 'id'>) => {
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "achievements"), newAchievementData);
            addToast('Conquista salva com sucesso!', 'success');
            invalidateAchievements();
        } catch (e: any) { addToast(`Erro ao salvar conquista: ${e.message}`, 'error'); }
        finally { setIsSubmitting(false); }
    }, [addToast, invalidateAchievements]);

    const handleUpdateAchievement = useCallback(async (updatedAchievement: Achievement) => {
        setIsSubmitting(true);
        try {
            const achievementRef = doc(db, "achievements", updatedAchievement.id);
            const { id, ...dataToUpdate } = updatedAchievement;
            await updateDoc(achievementRef, dataToUpdate as any);
            addToast('Conquista atualizada com sucesso!', 'success');
            invalidateAchievements();
        } catch (e: any) { 
            addToast(`Erro ao atualizar conquista: ${e.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [addToast, invalidateAchievements]);

    const handleDeleteAchievement = useCallback(async (achievementId: string) => {
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "achievements", achievementId));
            addToast('Conquista excluída com sucesso!', 'success');
            invalidateAchievements();
        } catch (e: any) { 
            addToast(`Erro ao excluir conquista: ${e.message}`, 'error');
            throw e;
        } finally {
            setIsSubmitting(false);
        }
    }, [addToast, invalidateAchievements]);


    const value = {
        modules, totalModulesCount, quizzes, achievements, isLoading, isLoadingModules, hasMoreModules, isSubmitting, isOffline,
        handleDeleteAllModules, handleDeleteModule, handleBulkDeleteModules, 
        handleSaveQuiz, handleUpdateQuiz, handleDeleteQuiz, 
        handleSaveAchievement, handleUpdateAchievement, handleDeleteAchievement, 
        handleSaveModule, handleUpdateModule,
        fetchData, fetchNextModulesPage
    };

    return <AdminDataContext.Provider value={value as AdminDataContextType}>{children}</AdminDataContext.Provider>;
};

export const useAdminData = (): AdminDataContextType => {
    const context = useContext(AdminDataContext);
    if (context === undefined) {
        throw new Error('useAdminData must be used within an AdminDataProvider');
    }
    return context;
};
