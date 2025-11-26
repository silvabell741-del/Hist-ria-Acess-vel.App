
import React, { useState, useCallback, useEffect } from 'react';
import { 
    collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, 
    serverTimestamp, Timestamp, writeBatch, increment, getDoc, arrayUnion, runTransaction, limit 
} from 'firebase/firestore';
import { db } from '../../components/firebaseClient';
import type { ClassInvitation, TeacherClass } from '../../types';
import { createNotification } from '../../utils/createNotification';

export function useTeacherCommunication(
    user: any, 
    addToast: (msg: string, type: any) => void,
    setTeacherClasses: React.Dispatch<React.SetStateAction<TeacherClass[]>>,
    teacherClasses: TeacherClass[]
) {
    const [pendingInvitations, setPendingInvitations] = useState<ClassInvitation[]>([]);
    const [isLoadingComm, setIsLoadingComm] = useState(true);
    const [isSubmittingComm, setIsSubmittingComm] = useState(false);

    const fetchTeacherCommunication = useCallback(async (forceRefresh = false) => {
        if (!user) return;
        setIsLoadingComm(true);
        try {
            // 1. Invitations (Only fetch invites, notifications are removed for teachers)
            const qInvites = query(
                collection(db, "invitations"),
                where("inviteeId", "==", user.id),
                where("status", "==", "pending")
            );
            const snapInvites = await getDocs(qInvites);
            const invites = snapInvites.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id, ...data,
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
                } as ClassInvitation;
            });
            setPendingInvitations(invites);

        } catch (error: any) {
            console.error("Error fetching communication:", error);
        } finally {
            setIsLoadingComm(false);
        }
    }, [user]);

    // Trigger initial fetch
    useEffect(() => {
        if (user) {
            fetchTeacherCommunication();
        }
    }, [user, fetchTeacherCommunication]);

    const handlePostNotice = useCallback(async (classId: string, text: string) => {
        if (!user) return;
        try {
            const noticeId = Date.now().toString();
            const notice = { id: noticeId, text, author: user.name, authorId: user.id, timestamp: Timestamp.now() };
            const noticeForState = { ...notice, timestamp: new Date().toISOString() };
            
            const classRef = doc(db, "classes", classId);
            
            setTeacherClasses(prev => prev.map(c => 
                c.id === classId ? { ...c, notices: [noticeForState, ...c.notices], noticeCount: (c.noticeCount || 0) + 1 } : c
            ));

            const classSnap = await getDoc(classRef);
            if(classSnap.exists()) {
                const currentNotices = classSnap.data().notices || [];
                await updateDoc(classRef, { notices: [notice, ...currentNotices], noticeCount: increment(1) });
                
                const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30); 
                await addDoc(collection(db, "broadcasts"), {
                    classId, type: 'notice_post', title: 'Novo Aviso', summary: `Professor ${user.name}: "${text}"`,
                    authorName: user.name, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
                    deepLink: { page: 'join_class' } 
                });
                addToast("Aviso postado!", "success");
            }
        } catch (error) { console.error(error); addToast("Erro ao postar aviso.", "error"); }
    }, [user, addToast, setTeacherClasses]);

    const handleInviteTeacher = useCallback(async (classId: string, email: string, subject: string) => {
        if (!user) return;
        setIsSubmittingComm(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) { addToast("Usuário não encontrado.", "error"); setIsSubmittingComm(false); return; }
            const invitedUserDoc = snapshot.docs[0];
            const invitedUserData = invitedUserDoc.data();

            if (invitedUserData.role !== 'professor') { addToast("O usuário não é um professor.", "error"); setIsSubmittingComm(false); return; }

            const currentClass = teacherClasses.find(c => c.id === classId);
            if (currentClass && currentClass.teachers?.includes(invitedUserDoc.id)) { addToast("Este professor já está na turma.", "info"); setIsSubmittingComm(false); return; }

            const invitesRef = collection(db, "invitations");
            const qInvite = query(invitesRef, where("classId", "==", classId), where("inviteeId", "==", invitedUserDoc.id), where("status", "==", "pending"));
            const inviteSnap = await getDocs(qInvite);
            if (!inviteSnap.empty) { addToast("Já existe um convite pendente.", "info"); setIsSubmittingComm(false); return; }

            await addDoc(invitesRef, {
                type: 'class_co_teacher', classId, className: currentClass?.name || 'Turma',
                inviterId: user.id, inviterName: user.name, inviteeId: invitedUserDoc.id, inviteeEmail: email,
                subject, status: 'pending', timestamp: serverTimestamp()
            });

            await createNotification({
                userId: invitedUserDoc.id, actorId: user.id, actorName: user.name, type: 'notice_post',
                title: 'Convite para Co-Docência', text: `Você foi convidado para ser professor da turma "${currentClass?.name}".`, classId
            });

            addToast(`Convite enviado para ${invitedUserData.name}.`, "success");
        } catch (error) { console.error(error); addToast("Erro ao enviar convite.", "error"); } finally { setIsSubmittingComm(false); }
    }, [user, teacherClasses, addToast]);

    const handleAcceptInvite = useCallback(async (invitation: ClassInvitation) => {
        if (!user) return;
        setIsSubmittingComm(true);
        try {
            await runTransaction(db, async (transaction) => {
                const classRef = doc(db, "classes", invitation.classId);
                const inviteRef = doc(db, "invitations", invitation.id);
                const classDoc = await transaction.get(classRef);
                if (!classDoc.exists()) throw "Turma não existe mais.";
                transaction.update(classRef, { teachers: arrayUnion(user.id), [`subjects.${user.id}`]: invitation.subject, [`teacherNames.${user.id}`]: user.name });
                transaction.delete(inviteRef);
            });
            setPendingInvitations(prev => prev.filter(i => i.id !== invitation.id));
            addToast("Convite aceito! A turma aparecerá em breve.", "success");
        } catch (error) { console.error(error); addToast("Erro ao aceitar convite.", "error"); } finally { setIsSubmittingComm(false); }
    }, [user, addToast]);

    const handleDeclineInvite = useCallback(async (invitationId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "invitations", invitationId));
            setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
            addToast("Convite recusado.", "info");
        } catch (error) { console.error(error); addToast("Erro ao recusar convite.", "error"); }
    }, [user, addToast]);

    const handleCleanupOldData = useCallback(async () => {
        if (!user) return;
        setIsSubmittingComm(true);
        try {
            const now = Timestamp.now();
            const q = query(collection(db, "broadcasts"), where("expiresAt", "<", now), limit(500));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => { batch.delete(doc.ref); });
                await batch.commit();
                addToast(`${snapshot.size} notificações removidas.`, "success");
            } else {
                addToast("Nenhuma notificação expirada.", "info");
            }
        } catch (error: any) { console.error(error); addToast("Erro na limpeza.", "error"); } finally { setIsSubmittingComm(false); }
    }, [user, addToast]);

    return {
        pendingInvitations, isLoadingComm, isSubmittingComm,
        fetchTeacherCommunication, handlePostNotice, handleInviteTeacher,
        handleAcceptInvite, handleDeclineInvite, handleCleanupOldData
    };
}
