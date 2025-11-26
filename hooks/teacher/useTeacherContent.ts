
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, 
    serverTimestamp, increment, setDoc, writeBatch, Timestamp, getDoc 
} from 'firebase/firestore';
import { db } from '../../components/firebaseClient';
import type { Module, Activity, TeacherClass, PendingActivity, StudentGradeSummaryDoc, GradeReportUnidade, Unidade } from '../../types';
import { createNotification } from '../../utils/createNotification';

export function useTeacherContent(
    user: any, 
    addToast: (msg: string, type: any) => void,
    setTeacherClasses: React.Dispatch<React.SetStateAction<TeacherClass[]>>,
    teacherClasses: TeacherClass[]
) {
    const [modules, setModules] = useState<Module[]>([]);
    const [draftActivities, setDraftActivities] = useState<Activity[]>([]);
    const [draftModules, setDraftModules] = useState<Module[]>([]);
    const [pendingActivitiesList, setPendingActivitiesList] = useState<PendingActivity[]>([]); // Standalone pending list
    const [isLoadingContent, setIsLoadingContent] = useState(true);
    const [isSubmittingContent, setIsSubmittingContent] = useState(false);
    const [modulesLibraryLoaded, setModulesLibraryLoaded] = useState(false);

    // Ref to break dependency cycle in fetchTeacherContent
    const teacherClassesRef = useRef(teacherClasses);

    useEffect(() => {
        teacherClassesRef.current = teacherClasses;
    }, [teacherClasses]);

    // --- Fetch Logic (Graceful Degradation) ---
    const fetchTeacherContent = useCallback(async (forceRefresh = false) => {
        if (!user) return;
        setIsLoadingContent(true);

        // 1. Pendências
        const fetchPending = async () => {
            try {
                const qPending = query(
                    collection(db, "activities"), 
                    where("creatorId", "==", user.id),
                    where("status", "==", "Pendente")
                );
                let snapPending;
                if (!forceRefresh) try { snapPending = await getDocs(qPending); } catch {}
                if (!snapPending || snapPending.empty) snapPending = await getDocs(qPending);
                
                const loadedPendingList: PendingActivity[] = [];
                const fullActivities: Activity[] = [];
                
                snapPending.docs.forEach(d => {
                    const data = d.data();
                    const pendingCount = data.pendingSubmissionCount || 0;
                    const className = data.className || 'Turma desconhecida';
                    
                    fullActivities.push({ id: d.id, ...data, className } as Activity);

                    if (pendingCount > 0) {
                        loadedPendingList.push({
                            id: d.id,
                            title: data.title,
                            className: className,
                            classId: data.classId,
                            pendingCount
                        });
                    }
                });

                setPendingActivitiesList(loadedPendingList);

                // Atualização segura de turmas
                setTeacherClasses(prev => prev.map(c => ({
                    ...c,
                    activities: fullActivities.filter(a => a.classId === c.id)
                })));
            } catch (error: any) {
                console.warn("Falha parcial ao carregar pendências:", error);
            }
        };

        // 2. Rascunhos de Atividades
        const fetchDraftActivities = async () => {
            try {
                const qDrafts = query(
                    collection(db, "activities"),
                    where("creatorId", "==", user.id),
                    where("status", "==", "Rascunho")
                );
                let snapDrafts;
                if (!forceRefresh) try { snapDrafts = await getDocs(qDrafts); } catch {}
                if (!snapDrafts || snapDrafts.empty) snapDrafts = await getDocs(qDrafts);

                const drafts = snapDrafts.docs.map(d => ({ 
                    id: d.id, ...d.data(), 
                    createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : d.data().createdAt
                } as Activity));
                setDraftActivities(drafts);
            } catch (error: any) {
                console.warn("Falha parcial ao carregar rascunhos de atividades:", error);
            }
        };

        // 3. Rascunhos de Módulos
        const fetchDraftModules = async () => {
            try {
                const qDraftModules = query(
                    collection(db, "modules"),
                    where("creatorId", "==", user.id),
                    where("status", "==", "Rascunho")
                );
                let snapDraftModules;
                if (!forceRefresh) try { snapDraftModules = await getDocs(qDraftModules); } catch {}
                if (!snapDraftModules || snapDraftModules.empty) snapDraftModules = await getDocs(qDraftModules);

                const draftsMod = snapDraftModules.docs.map(d => ({
                    id: d.id, ...d.data(),
                    date: d.data().date?.toDate ? d.data().date.toDate().toISOString() : d.data().date
                } as Module));
                setDraftModules(draftsMod);
            } catch (error: any) {
                console.warn("Falha parcial ao carregar rascunhos de módulos:", error);
            }
        };

        // Executa tudo em paralelo
        await Promise.allSettled([fetchPending(), fetchDraftActivities(), fetchDraftModules()]);
        setIsLoadingContent(false);

    }, [user, addToast, setTeacherClasses]);

    // Trigger initial fetch
    useEffect(() => {
        if (user) {
            fetchTeacherContent();
        }
    }, [user, fetchTeacherContent]);

    // 4. Biblioteca de Módulos (Lazy Load)
    const fetchModulesLibrary = useCallback(async () => {
        if (modulesLibraryLoaded || !user) return;
        try {
            const snapModules = await getDocs(query(collection(db, "modules"), where("status", "==", "Ativo")));
            const fetchedModules = snapModules.docs.map(d => ({ id: d.id, ...d.data() } as Module));
            
            const visibleModules = fetchedModules.filter(m => 
                m.visibility === 'public' || m.creatorId === user.id
            );
            setModules(visibleModules);
            setModulesLibraryLoaded(true);
        } catch (error) {
            console.error("Error loading modules library:", error);
            // Fallback gracioso: lista vazia
            setModules([]);
        }
    }, [modulesLibraryLoaded, user]);

    // --- HELPER: Recalculate and Save Grade Summary (Architecture V2) ---
    const recalculateStudentGradeSummary = useCallback(async (classId: string, studentId: string, updatedActivityInfo?: { activityId: string, grade: number }) => {
        try {
            const currentClasses = teacherClassesRef.current;
            const cls = currentClasses.find(c => c.id === classId);
            
            if (!cls) return; // Safety check

            const activities = cls.activities || [];
            const summaryId = `${classId}_${studentId}`;
            
            const reportUnidades: { [key in Unidade]?: GradeReportUnidade } = {};

            // Iterate over all activities in memory for this class
            for (const activity of activities) {
                let submission = activity.submissions?.find(s => s.studentId === studentId);
                
                // Override if this is the activity currently being updated (React state might be stale)
                if (updatedActivityInfo && activity.id === updatedActivityInfo.activityId) {
                    // Create a mock submission object for the calculation
                    submission = { 
                        ...submission, 
                        studentId, 
                        studentName: '', // Not needed for summary
                        submissionDate: '',
                        content: '',
                        status: 'Corrigido',
                        grade: updatedActivityInfo.grade 
                    } as any;
                }

                if (submission && submission.status === 'Corrigido' && typeof submission.grade === 'number') {
                    const unidade = (activity.unidade as Unidade) || '1ª Unidade';
                    const materia = activity.materia || 'Geral';

                    if (!reportUnidades[unidade]) {
                        reportUnidades[unidade] = { subjects: {} };
                    }
                    if (!reportUnidades[unidade]!.subjects[materia]) {
                        reportUnidades[unidade]!.subjects[materia] = { activities: [], totalPoints: 0 };
                    }

                    const subjEntry = reportUnidades[unidade]!.subjects[materia];
                    subjEntry.activities.push({
                        id: activity.id,
                        title: activity.title,
                        grade: submission.grade,
                        maxPoints: activity.points,
                        materia: materia
                    });
                    subjEntry.totalPoints += submission.grade;
                }
            }

            const summaryDoc: StudentGradeSummaryDoc = {
                classId,
                studentId,
                className: cls.name,
                unidades: reportUnidades,
                updatedAt: serverTimestamp()
            };

            // Write optimized document
            await setDoc(doc(db, "student_grades", summaryId), summaryDoc, { merge: true });

        } catch (error) {
            console.error("Failed to update student grade summary:", error);
        }
    }, []);

    // --- Actions ---

    const handleSaveActivity = useCallback(async (activity: Omit<Activity, 'id'>, isDraft: boolean = false) => {
        if (!user) return false;
        try {
            const status = isDraft ? "Rascunho" : "Pendente";
            const docRef = await addDoc(collection(db, "activities"), { 
                ...activity, status, pendingSubmissionCount: 0, submissionCount: 0, submissions: [], createdAt: serverTimestamp() 
            });
            
            if (isDraft) {
                const newDraft = { id: docRef.id, ...activity, status, pendingSubmissionCount: 0, submissionCount: 0, submissions: [], createdAt: new Date().toISOString() } as Activity;
                setDraftActivities(prev => [newDraft, ...prev]);
                addToast("Atividade salva como rascunho!", "success");
                return true;
            }

            if (activity.classId) {
                const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
                await addDoc(collection(db, "broadcasts"), {
                    classId: activity.classId, type: 'activity_post', title: 'Nova Atividade',
                    summary: `O professor ${user.name} postou uma nova atividade: "${activity.title}"`,
                    authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                    deepLink: { page: 'activities' }
                });
            }
            addToast("Atividade publicada com sucesso!", "success");
            // Update pending list implicitly via fetch or manual add if needed, but fetch is safer
            fetchTeacherContent(true);
            return true;
        } catch (error) { console.error(error); addToast("Erro ao criar atividade.", "error"); return false; }
    }, [user, addToast, fetchTeacherContent]);

    const handleUpdateActivity = useCallback(async (activityId: string, activityData: Partial<Activity>, isDraft: boolean = false) => {
        if (!user) return false;
        try {
            const activityRef = doc(db, "activities", activityId);
            const status = isDraft ? "Rascunho" : "Pendente";
            await updateDoc(activityRef, { ...activityData, status, ...(isDraft ? {} : { createdAt: serverTimestamp() }) });

            if (isDraft) {
                setDraftActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...activityData, status } : a));
                addToast("Rascunho atualizado!", "success");
                return true;
            }

            if (activityData.classId) {
                const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
                await addDoc(collection(db, "broadcasts"), {
                    classId: activityData.classId, type: 'activity_post', title: 'Nova Atividade',
                    summary: `O professor ${user.name} postou uma nova atividade: "${activityData.title}"`,
                    authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                    deepLink: { page: 'activities' }
                });
                setDraftActivities(prev => prev.filter(a => a.id !== activityId));
            }
            addToast("Atividade publicada com sucesso!", "success");
            fetchTeacherContent(true);
            return true;
        } catch (error) { console.error(error); addToast("Erro ao atualizar atividade.", "error"); return false; }
    }, [user, addToast, fetchTeacherContent]);

    // NOVA FUNÇÃO: Publicar Clona o Rascunho
    const handlePublishDraft = useCallback(async (activityId: string, updateData: { classId: string, className: string, dueDate: string, points: number }) => {
        if (!user) return false;
        try {
            // 1. Buscar o Rascunho Original
            const draftRef = doc(db, "activities", activityId);
            const draftSnap = await getDoc(draftRef);
            
            if (!draftSnap.exists()) {
                addToast("Rascunho não encontrado.", "error");
                return false;
            }

            const draftData = draftSnap.data();
            // Removemos o ID para criar um novo documento
            const { id, ...rest } = draftData as any;

            // 2. Criar Novo Objeto de Atividade (Clone)
            const newActivityPayload = {
                ...rest,
                // Sobrescreve com os dados de publicação
                classId: updateData.classId,
                className: updateData.className,
                dueDate: updateData.dueDate,
                points: updateData.points,
                // Reseta status e contadores
                status: 'Pendente',
                submissionCount: 0,
                pendingSubmissionCount: 0,
                submissions: [],
                createdAt: serverTimestamp(),
                originalDraftId: activityId // Rastreabilidade
            };

            // 3. Salvar Nova Atividade
            await addDoc(collection(db, "activities"), newActivityPayload);

            // 4. Enviar Notificação (Broadcast)
            const expiresAt = new Date(); 
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            await addDoc(collection(db, "broadcasts"), {
                classId: updateData.classId, 
                type: 'activity_post', 
                title: 'Nova Atividade',
                summary: `O professor ${user.name} postou uma nova atividade: "${newActivityPayload.title}"`,
                authorName: user.name, 
                timestamp: serverTimestamp(), 
                expiresAt: Timestamp.fromDate(expiresAt),
                deepLink: { page: 'activities' }
            });

            addToast("Atividade publicada com sucesso! (Rascunho mantido)", "success");
            fetchTeacherContent(true);
            return true;

        } catch (error: any) {
            console.error("Error publishing draft:", error);
            addToast(`Erro ao publicar: ${error.message}`, "error");
            return false;
        }
    }, [user, addToast, fetchTeacherContent]);

    const handleGradeActivity = useCallback(async (activityId: string, studentId: string, grade: number, feedback: string, scores?: Record<string, number>) => {
        try {
             const activityRef = doc(db, "activities", activityId);
             const activitySnap = await getDoc(activityRef);
             if (activitySnap.exists()) {
                 const activityData = activitySnap.data() as Activity;
                 const submissions = activityData.submissions || [];
                 const idx = submissions.findIndex(s => s.studentId === studentId);
                 let classId = activityData.classId;

                 if (idx > -1) {
                     submissions[idx].grade = grade;
                     submissions[idx].feedback = feedback;
                     submissions[idx].status = 'Corrigido';
                     submissions[idx].gradedAt = new Date().toISOString();
                     if (scores) submissions[idx].scores = scores;
                 }
                 
                 const submissionPayload: any = { 
                     status: 'Corrigido', 
                     grade, 
                     feedback, 
                     gradedAt: new Date().toISOString() 
                 };
                 if (scores) submissionPayload.scores = scores;

                 await setDoc(doc(collection(activityRef, "submissions"), studentId), submissionPayload, { merge: true });
                 await updateDoc(activityRef, { submissions: submissions, pendingSubmissionCount: increment(-1) });

                 if (user) {
                    await createNotification({
                        userId: studentId, actorId: user.id, actorName: user.name, type: 'activity_correction',
                        title: 'Atividade Corrigida', text: `Sua atividade "${activityData.title}" foi corrigida. Nota: ${grade}`,
                        classId: activityData.classId!, activityId: activityId
                    });
                 }

                 // Update pending list local state
                 setPendingActivitiesList(prev => prev.map(item => {
                     if (item.id === activityId) {
                         return { ...item, pendingCount: Math.max(item.pendingCount - 1, 0) };
                     }
                     return item;
                 }).filter(item => item.pendingCount > 0));

                 // Update class context (deep update)
                 setTeacherClasses(prevClasses => prevClasses.map(cls => {
                     if (cls.id !== classId) return cls;
                     return {
                         ...cls,
                         activities: cls.activities.map(act => {
                             if (act.id !== activityId) return act;
                             const updatedSubmissions = (act.submissions || []).map(sub => {
                                 if (sub.studentId !== studentId) return sub;
                                 const updatedSub = { ...sub, status: 'Corrigido', grade, feedback, gradedAt: new Date().toISOString() } as any;
                                 if (scores) updatedSub.scores = scores;
                                 return updatedSub;
                             });
                             return { ...act, submissions: updatedSubmissions, pendingSubmissionCount: Math.max((act.pendingSubmissionCount || 1) - 1, 0) };
                         })
                     };
                 }));

                 // *** ARCHITECTURE V2 UPDATE: Summarize Grade for Read Optimization ***
                 if (classId) {
                     recalculateStudentGradeSummary(classId, studentId, { activityId, grade });
                 }

                 return true;
             }
             return false;
        } catch (error: any) { console.error(error); addToast("Erro ao salvar nota.", "error"); return false; }
    }, [user, addToast, setTeacherClasses, recalculateStudentGradeSummary]);

    const handleDeleteActivity = useCallback(async (activityId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "activities", activityId));
            setDraftActivities(prev => prev.filter(a => a.id !== activityId));
            // Also remove from pending list if it was there
            setPendingActivitiesList(prev => prev.filter(a => a.id !== activityId));
            
            setTeacherClasses(prev => prev.map(c => ({
                ...c,
                activities: c.activities.filter(a => a.id !== activityId)
            })));
            addToast("Atividade excluída.", "success");
        } catch (error: any) { console.error(error); addToast("Erro ao excluir atividade.", "error"); }
    }, [user, addToast, setTeacherClasses]);

    const handleDeleteModule = useCallback(async (classId: string, moduleId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "modules", moduleId));
            await deleteDoc(doc(db, "module_contents", moduleId));

            setModules(prev => prev.filter(m => m.id !== moduleId));
            setDraftModules(prev => prev.filter(m => m.id !== moduleId));
            
            setTeacherClasses(prev => prev.map(cls => ({
                ...cls,
                modules: cls.modules.filter(m => m.id !== moduleId),
                moduleCount: cls.modules.some(m => m.id === moduleId) ? Math.max((cls.moduleCount || 1) - 1, 0) : cls.moduleCount
            })));
            addToast("Módulo excluído!", "success");
        } catch (error: any) { console.error(error); addToast("Erro ao excluir.", "error"); }
    }, [user, addToast, setTeacherClasses]);

    const handleSaveModule = useCallback(async (module: Omit<Module, 'id'>, isDraft: boolean = false) => {
        if (!user) return false;
        try {
            const { pages, ...metadata } = module;
            const status = isDraft ? "Rascunho" : "Ativo";
            
            const docRef = await addDoc(collection(db, "modules"), { 
                ...metadata, status, createdAt: serverTimestamp(), pages: [] 
            });
            await setDoc(doc(db, "module_contents", docRef.id), { pages: pages });

            if (isDraft) {
                const newDraft = { id: docRef.id, ...module, status } as Module;
                setDraftModules(prev => [newDraft, ...prev]);
                addToast("Módulo salvo como rascunho!", "success");
                setModulesLibraryLoaded(false);
                return true;
            }

            if (metadata.visibility === 'specific_class' && metadata.classIds && metadata.classIds.length > 0) {
                const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
                const batch = writeBatch(db);
                metadata.classIds.forEach(classId => {
                    const broadcastRef = doc(collection(db, "broadcasts"));
                    batch.set(broadcastRef, {
                        classId, type: 'module_post', title: 'Novo Módulo',
                        summary: `O professor ${user.name} publicou um novo módulo: "${metadata.title}"`,
                        authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                        deepLink: { page: 'modules', id: docRef.id }
                    });
                });
                await batch.commit();
            }
            addToast("Módulo criado!", "success");
            setModulesLibraryLoaded(false);
            return true;
        } catch (error) { console.error(error); addToast("Erro ao salvar.", "error"); return false; }
    }, [user, addToast]);

    const handleUpdateModule = useCallback(async (module: Module, isDraft: boolean = false) => {
        try {
            const { id, pages, ...data } = module;
            const status = isDraft ? "Rascunho" : "Ativo";
            await updateDoc(doc(db, "modules", id), { ...data, status, pages: [], ...(isDraft ? {} : { createdAt: serverTimestamp() }) });
            if (pages) await setDoc(doc(db, "module_contents", id), { pages }, { merge: true });

            if (isDraft) {
                setDraftModules(prev => prev.map(m => m.id === id ? { ...m, ...data, status } : m));
                addToast("Rascunho atualizado!", "success");
            } else {
                addToast("Módulo atualizado e publicado!", "success");
                setDraftModules(prev => prev.filter(m => m.id !== id));
                setModules(prev => prev.map(m => m.id === id ? module : m));
            }
        } catch (error) { console.error(error); addToast("Erro ao atualizar.", "error"); }
    }, [addToast]);

    const handlePublishModuleDraft = useCallback(async (moduleId: string, classIds: string[]) => {
        if (!user) return false;
        try {
            const module = draftModules.find(m => m.id === moduleId);
            if (!module) return false;

            await updateDoc(doc(db, "modules", moduleId), { status: "Ativo", classIds, visibility: 'specific_class', createdAt: serverTimestamp() });

            const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
            const batch = writeBatch(db);
            
            classIds.forEach(classId => {
                const broadcastRef = doc(collection(db, "broadcasts"));
                batch.set(broadcastRef, {
                    classId, type: 'module_post', title: 'Novo Módulo',
                    summary: `O professor ${user.name} publicou um novo módulo: "${module.title}"`,
                    authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                    deepLink: { page: 'modules', id: moduleId }
                });
            });
            await batch.commit();

            setDraftModules(prev => prev.filter(m => m.id !== moduleId));
            addToast("Módulo publicado com sucesso!", "success");
            setModulesLibraryLoaded(false); 
            return true;
        } catch (error) { console.error("Error publishing module:", error); addToast("Erro ao publicar módulo.", "error"); return false; }
    }, [user, draftModules, addToast]);

    return {
        modules, draftActivities, draftModules, pendingActivitiesList,
        isLoadingContent, isSubmittingContent,
        fetchTeacherContent, fetchModulesLibrary,
        handleSaveActivity, handleUpdateActivity, handleGradeActivity, handleDeleteActivity,
        handleDeleteModule, handleSaveModule, handleUpdateModule, handlePublishModuleDraft,
        handlePublishDraft
    };
}