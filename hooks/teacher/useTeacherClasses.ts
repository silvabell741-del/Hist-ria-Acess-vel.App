

import { useState, useCallback, useEffect } from 'react';
import { 
    collection, query, where, getDocs, doc, addDoc, serverTimestamp, getDoc, 
    writeBatch, updateDoc, arrayUnion, arrayRemove, deleteField 
} from 'firebase/firestore';
import { db } from '../../components/firebaseClient';
import type { TeacherClass, AttendanceSession, Turno, User, Activity, ClassSummary, AttendanceStatus } from '../../types';

export function useTeacherClasses(user: User | null, addToast: (msg: string, type: any) => void) {
    const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
    const [archivedClasses, setArchivedClasses] = useState<TeacherClass[]>([]);
    const [attendanceSessionsByClass, setAttendanceSessionsByClass] = useState<Record<string, AttendanceSession[]>>({});
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isSubmittingClass, setIsSubmittingClass] = useState(false);

    const fetchTeacherClasses = useCallback(async (forceRefresh = false) => {
        if (!user) return;
        setIsLoadingClasses(true);
        
        try {
            // --- STRATEGY: LAZY LOADING PRIORITY ---
            
            // 1. Check if User Profile has the Lightweight Summary (Fast Path)
            if (user.myClassesSummary && user.myClassesSummary.length > 0 && !forceRefresh) {
                const allSummaryClasses: TeacherClass[] = user.myClassesSummary.map(s => ({
                    id: s.id,
                    name: s.name,
                    code: s.code,
                    studentCount: s.studentCount,
                    students: [], // Lazy load later
                    notices: [], // Lazy load later
                    activities: [],
                    modules: [],
                    teacherId: user.id,
                    isFullyLoaded: false,
                    isSummaryOnly: true, // Marks as needing detail fetch
                    isArchived: s.isArchived || false
                }));
                
                // Split into Active and Archived
                setTeacherClasses(allSummaryClasses.filter(c => !c.isArchived));
                setArchivedClasses(allSummaryClasses.filter(c => c.isArchived));
                
                setIsLoadingClasses(false);
                return; // Exit early, huge performance win!
            }

            // 2. Fallback: Query Heavy Collection (Slow Path / First Run)
            const qClasses = query(collection(db, "classes"), where("teachers", "array-contains", user.id));
            const snapClasses = await getDocs(qClasses);
            
            const classesData: TeacherClass[] = [];
            const summaryToSave: ClassSummary[] = [];

            snapClasses.docs.forEach(d => {
                const data = d.data();
                
                // SOFT-DELETE FILTER: Skip classes where the teacher is marked as inactive
                if (data.inactiveTeachers && data.inactiveTeachers.includes(user.id)) {
                    return;
                }

                const rawNotices = Array.isArray(data.notices) ? data.notices : [];
                const myNotices = rawNotices.filter((n: any) => n.authorId === user.id).map((n: any) => ({
                    ...n,
                    timestamp: n.timestamp?.toDate ? n.timestamp.toDate().toISOString() : n.timestamp
                }));

                const studentCount = data.studentCount || (data.students?.length || 0);
                const isArchived = data.isArchived || false;

                // Create full object for state
                classesData.push({
                    id: d.id,
                    ...data,
                    students: Array.isArray(data.students) ? data.students : [],
                    notices: myNotices,
                    noticeCount: myNotices.length,
                    modules: [],
                    activities: [], 
                    isFullyLoaded: false, // Details like activities/sessions still need fetch
                    isSummaryOnly: false, // We have students, so it's not summary only
                    isArchived: isArchived
                } as TeacherClass);

                // Create summary for profile
                summaryToSave.push({
                    id: d.id,
                    name: data.name,
                    code: data.code,
                    studentCount: studentCount,
                    isArchived: isArchived
                });
            });

            // Split and set state
            setTeacherClasses(classesData.filter(c => !c.isArchived));
            setArchivedClasses(classesData.filter(c => c.isArchived));

            // 3. Auto-Migration: Save Summary to User Profile for next time
            if (summaryToSave.length > 0) {
                const userRef = doc(db, "users", user.id);
                await updateDoc(userRef, { myClassesSummary: summaryToSave });
            }

        } catch (error: any) {
            console.error("Error fetching classes:", error);
            // Graceful degradation: Show empty state or retry button, but don't crash app
            if (error.code === 'permission-denied') {
                addToast("Permissão negada para carregar turmas.", "error");
            } else {
                addToast("Falha de conexão ao carregar turmas.", "error");
            }
        } finally {
            setIsLoadingClasses(false);
        }
    }, [user, addToast]);

    // Trigger initial fetch
    useEffect(() => {
        if (user) {
            fetchTeacherClasses();
        }
    }, [user, fetchTeacherClasses]);

    const fetchClassDetails = useCallback(async (classId: string) => {
        if (!user) return;
        
        // Check both active and archived lists
        const existingClass = teacherClasses.find(c => c.id === classId) || archivedClasses.find(c => c.id === classId);
        if (existingClass?.isFullyLoaded) return; // Already fetched everything

        try {
            // 1. If class was loaded via Summary (Lightweight), fetch the Class Document first to get Students/Notices
            let classDetailsUpdate: Partial<TeacherClass> = {};
            
            if (existingClass?.isSummaryOnly) {
                const classDocRef = doc(db, "classes", classId);
                const classSnap = await getDoc(classDocRef);
                if (classSnap.exists()) {
                    const data = classSnap.data();
                    
                    // Extra check for soft-delete during lazy load
                    if (data.inactiveTeachers && data.inactiveTeachers.includes(user.id)) {
                        // Remove from both lists to be safe
                        setTeacherClasses(prev => prev.filter(c => c.id !== classId));
                        setArchivedClasses(prev => prev.filter(c => c.id !== classId));
                        return;
                    }

                    const rawNotices = Array.isArray(data.notices) ? data.notices : [];
                    const myNotices = rawNotices.filter((n: any) => n.authorId === user.id).map((n: any) => ({
                        ...n,
                        timestamp: n.timestamp?.toDate ? n.timestamp.toDate().toISOString() : n.timestamp
                    }));

                    classDetailsUpdate = {
                        students: Array.isArray(data.students) ? data.students : [],
                        notices: myNotices,
                        noticeCount: myNotices.length,
                        teachers: data.teachers,
                        subjects: data.subjects,
                        teacherNames: data.teacherNames,
                        isSummaryOnly: false,
                        isArchived: data.isArchived || false
                    };
                }
            }

            // 2. Fetch Activities and Sessions (Standard Detail Fetch)
            const qActivities = query(
                collection(db, "activities"), 
                where("classId", "==", classId),
                where("creatorId", "==", user.id)
            );
            
            const qSessions = query(
                collection(db, "attendance_sessions"), 
                where("classId", "==", classId), 
                where("teacherId", "==", user.id)
            );

            const [snapActivities, snapSessions] = await Promise.all([
                getDocs(qActivities),
                getDocs(qSessions)
            ]);

            const activities = snapActivities.docs.map(d => ({ 
                id: d.id, ...d.data(), className: existingClass?.name || 'Turma' 
            } as Activity)).sort((a, b) => {
                const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tB - tA;
            });

            const sessions = snapSessions.docs.map(d => {
                const docData = d.data();
                return {
                    id: d.id,
                    ...docData,
                    createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : docData.createdAt
                } as AttendanceSession;
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // 3. Merge Updates Helper
            const updateList = (list: TeacherClass[]) => list.map(c => {
                if (c.id === classId) {
                    return {
                        ...c,
                        ...classDetailsUpdate,
                        activities: activities, 
                        isFullyLoaded: true
                    };
                }
                return c;
            });

            setTeacherClasses(prev => updateList(prev));
            setArchivedClasses(prev => updateList(prev));

            setAttendanceSessionsByClass(prev => ({
                ...prev,
                [classId]: sessions
            }));

        } catch (error) {
            console.error("Error loading class details:", error);
            // Graceful fail: User can still see class name/code even if details fail
            addToast("Erro ao carregar detalhes. Algumas informações podem estar indisponíveis.", "error");
        }
    }, [user, teacherClasses, archivedClasses, addToast]);

    const handleCreateClass = useCallback(async (name: string) => {
         if (!user) return;
         setIsSubmittingClass(true);
         try {
             const code = Math.random().toString(36).substring(2, 8).toUpperCase();
             const newClassPayload = { 
                 name, 
                 teacherId: user.id, 
                 teachers: [user.id], 
                 subjects: { [user.id]: 'Regente' }, 
                 teacherNames: { [user.id]: user.name }, 
                 code, 
                 students: [], 
                 studentCount: 0, 
                 notices: [], 
                 noticeCount: 0, 
                 createdAt: serverTimestamp(),
                 isArchived: false
             };
             
             // 1. Create Class Document
             const docRef = await addDoc(collection(db, "classes"), newClassPayload);
             
             // 2. Update User Summary (Keep profile in sync for lazy loading)
             const userRef = doc(db, "users", user.id);
             const newSummary: ClassSummary = {
                 id: docRef.id,
                 name,
                 code,
                 studentCount: 0,
                 isArchived: false
             };
             await updateDoc(userRef, {
                 myClassesSummary: arrayUnion(newSummary)
             });

             // 3. Update Local State
             const newClass: TeacherClass = { 
                 id: docRef.id, 
                 ...newClassPayload, 
                 notices: [], activities: [], modules: [], 
                 createdAt: new Date().toISOString(), 
                 isFullyLoaded: true,
                 isSummaryOnly: false
             } as any;
             
             setTeacherClasses(prev => [...prev, newClass]);

             addToast("Turma criada!", "success");
         } catch (error) { console.error(error); addToast("Erro ao criar turma.", "error"); } finally { setIsSubmittingClass(false); }
    }, [user, addToast]);

    const handleArchiveClass = useCallback(async (classId: string) => {
        if (!user) return;
        setIsSubmittingClass(true);
        try {
            // 1. Update Firestore: Set isArchived = true
            await updateDoc(doc(db, 'classes', classId), { isArchived: true });

            // 2. Update User Profile Summary
            const userRef = doc(db, 'users', user.id);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const currentSummary = userSnap.data().myClassesSummary || [];
                const updatedSummary = currentSummary.map((s: any) => 
                    s.id === classId ? { ...s, isArchived: true } : s
                );
                await updateDoc(userRef, { myClassesSummary: updatedSummary });
            }

            // 3. Move class from active list to archived list in local state
            setTeacherClasses(prev => {
                const cls = prev.find(c => c.id === classId);
                if (cls) {
                    setArchivedClasses(arch => [...arch, { ...cls, isArchived: true }]);
                    return prev.filter(c => c.id !== classId);
                }
                return prev;
            });

            addToast("Turma concluída e arquivada com sucesso.", "success");
        } catch (error: any) {
            console.error("Error archiving class:", error);
            addToast("Erro ao arquivar turma.", "error");
        } finally {
            setIsSubmittingClass(false);
        }
    }, [user, addToast]);

    const handleLeaveClass = useCallback(async (classId: string) => {
        if (!user) return;
        setIsSubmittingClass(true);
        try {
            // 1. SOFT LEAVE
            await updateDoc(doc(db, 'classes', classId), {
                inactiveTeachers: arrayUnion(user.id)
            });

            // 2. Remover do perfil do usuário (myClassesSummary)
            const userRef = doc(db, 'users', user.id);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const currentSummary = userSnap.data().myClassesSummary || [];
                const newSummary = currentSummary.filter((s: any) => s.id !== classId);
                await updateDoc(userRef, { myClassesSummary: newSummary });
            }

            // 3. Atualizar estado local
            setTeacherClasses(prev => prev.filter(c => c.id !== classId));
            
            addToast("Você saiu da turma com sucesso.", "success");

        } catch (error: any) {
            console.error("Error leaving class:", error);
            addToast("Erro ao sair da turma. Tente novamente.", "error");
        } finally {
            setIsSubmittingClass(false);
        }
    }, [user, addToast]);

    const handleCreateAttendanceSession = useCallback(async (classId: string, date: string, turno: Turno, horario: number) => {
        if (!user) return;
        setIsSubmittingClass(true);
        try {
            const sessionData = { classId, date, turno, horario, teacherId: user.id, createdAt: serverTimestamp() };
            const docRef = await addDoc(collection(db, "attendance_sessions"), sessionData);
            const newSession: AttendanceSession = { id: docRef.id, ...sessionData, createdAt: new Date().toISOString() } as any;

            // Ensure we check active list first, then archived (though unlikely to create session in archived)
            const cls = teacherClasses.find(c => c.id === classId) || archivedClasses.find(c => c.id === classId);
            
            if (cls && cls.students && cls.students.length > 0) {
                const batch = writeBatch(db);
                const recordsRef = collection(db, "attendance_sessions", docRef.id, "records");
                cls.students.forEach(student => {
                    batch.set(doc(recordsRef), { sessionId: docRef.id, studentId: student.id, studentName: student.name, status: 'pendente', updatedAt: serverTimestamp() });
                });
                await batch.commit();
            } else if (cls?.isSummaryOnly) {
                 console.warn("Tentativa de criar chamada sem lista de alunos carregada.");
            }

            setAttendanceSessionsByClass(prev => ({ ...prev, [classId]: [newSession, ...(prev[classId] || [])] }));
            
            addToast("Chamada criada!", "success");
        } catch (error) { console.error(error); addToast("Erro ao criar chamada.", "error"); } finally { setIsSubmittingClass(false); }
    }, [user, teacherClasses, archivedClasses, addToast]);

    const handleUpdateAttendanceStatus = useCallback(async (sessionId: string, recordId: string, status: AttendanceStatus) => {
        try {
            const recordRef = doc(db, "attendance_sessions", sessionId, "records", recordId);
            await updateDoc(recordRef, { status, updatedAt: serverTimestamp() });
        } catch (error) { console.error(error); addToast("Erro ao atualizar.", "error"); throw error; }
    }, [addToast]);

    const getAttendanceSession = useCallback(async (sessionId: string) => { 
        try { 
            const snap = await getDoc(doc(db, "attendance_sessions", sessionId)); 
            if (snap.exists()) return { id: snap.id, ...snap.data() } as AttendanceSession; 
            return null; 
        } catch { return null; } 
    }, []);

    return {
        teacherClasses,
        archivedClasses,
        attendanceSessionsByClass,
        isLoadingClasses,
        isSubmittingClass,
        fetchTeacherClasses,
        fetchClassDetails,
        handleCreateClass,
        handleArchiveClass,
        handleLeaveClass,
        handleCreateAttendanceSession,
        handleUpdateAttendanceStatus,
        getAttendanceSession,
        setTeacherClasses
    };
}