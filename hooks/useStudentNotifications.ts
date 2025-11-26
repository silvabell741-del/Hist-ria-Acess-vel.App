
import { useState, useEffect, useMemo } from 'react';
import { 
    collection, query, where, orderBy, limit, onSnapshot, Timestamp, 
    doc, writeBatch, updateDoc, setDoc 
} from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import type { Notification, TeacherClass, User } from '../types';

export function useStudentNotifications(user: User | null, studentClasses: TeacherClass[]) {
    const [privateNotifications, setPrivateNotifications] = useState<Notification[]>([]);
    const [broadcastNotifications, setBroadcastNotifications] = useState<Notification[]>([]);
    const [readReceipts, setReadReceipts] = useState<Set<string>>(new Set());

    // 1. Listener de Notificações Privadas
    useEffect(() => {
        if (!user || user.role !== 'aluno') return;

        const notifQuery = query(
            collection(db, "notifications"), 
            where("userId", "==", user.id), 
            where("read", "==", false), 
            orderBy("timestamp", "desc"),
            limit(20)
        );
        
        const unsubNotif = onSnapshot(notifQuery, (snap) => {
            const validNotifs: Notification[] = [];
            const now = Date.now();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

            snap.docs.forEach(d => {
                const data = d.data();
                let dateObj: Date;
                if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
                else if (typeof data.timestamp === 'string') dateObj = new Date(data.timestamp);
                else dateObj = new Date();

                if (isNaN(dateObj.getTime())) dateObj = new Date();

                if (now - dateObj.getTime() <= sevenDaysMs) {
                    validNotifs.push({ id: d.id, ...data, timestamp: dateObj.toISOString() } as Notification);
                }
            });

            setPrivateNotifications(validNotifs);
        });

        // 2. Listener de Recibos de Leitura
        const receiptsQuery = collection(db, "users", user.id, "read_notifications");
        const unsubReceipts = onSnapshot(receiptsQuery, (snap) => {
            const ids = new Set(snap.docs.map(d => d.id));
            setReadReceipts(ids);
        });

        return () => {
            unsubNotif();
            unsubReceipts();
        };
    }, [user]);

    // 2. Listener de Broadcasts (Turma) com Chunking (Suporte a >10 turmas)
    useEffect(() => {
        if (!user || user.role !== 'aluno' || studentClasses.length === 0) {
            setBroadcastNotifications([]);
            return;
        }

        const myClassIds = studentClasses.map(c => c.id);
        if (myClassIds.length === 0) return;

        // Firestore limita 'in' query a 10 itens. Dividimos em chunks.
        const chunks: string[][] = [];
        for (let i = 0; i < myClassIds.length; i += 10) {
            chunks.push(myClassIds.slice(i, i + 10));
        }

        const unsubs: (() => void)[] = [];
        // Armazena notificações por chunk para evitar sobrescrita
        const chunkResults: Record<number, Notification[]> = {};

        const updateBroadcasts = () => {
            const allBroadcasts = Object.values(chunkResults).flat();
            // Remove duplicatas baseadas no ID (caso existam) e ordena
            const uniqueBroadcasts = Array.from(new Map(allBroadcasts.map(item => [item.id, item])).values());
            uniqueBroadcasts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setBroadcastNotifications(uniqueBroadcasts);
        };

        chunks.forEach((chunk, index) => {
            const broadcastQuery = query(
                collection(db, "broadcasts"),
                where("classId", "in", chunk),
                where("expiresAt", ">", Timestamp.now()) 
            );

            const unsub = onSnapshot(broadcastQuery, (snap) => {
                const fetchedBroadcasts: Notification[] = [];
                
                snap.docs.forEach(d => {
                    const data = d.data();
                    let dateObj: Date;
                    if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
                    else if (typeof data.timestamp === 'string') dateObj = new Date(data.timestamp);
                    else dateObj = new Date();

                    fetchedBroadcasts.push({
                        id: d.id,
                        title: data.title,
                        summary: data.summary,
                        urgency: 'medium', 
                        deepLink: data.deepLink || { page: 'dashboard' },
                        read: false,
                        timestamp: dateObj.toISOString(),
                        userId: user.id 
                    } as Notification);
                });

                chunkResults[index] = fetchedBroadcasts;
                updateBroadcasts();
            });
            unsubs.push(unsub);
        });

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [user, studentClasses]);

    // Merge e Cálculo
    const notifications = useMemo(() => {
        const combined = [...privateNotifications, ...broadcastNotifications];
        
        const processed = combined.map(n => ({
            ...n,
            read: n.read || readReceipts.has(n.id)
        }));

        return processed.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [privateNotifications, broadcastNotifications, readReceipts]);

    const unreadNotificationCount = notifications.filter(n => !n.read).length;

    // Ações
    const handleMarkAllNotificationsRead = async () => {
        if (!user) return;
        try {
            const batch = writeBatch(db);
            
            notifications.forEach(n => {
                const isPrivate = privateNotifications.some(pn => pn.id === n.id);
                const isBroadcast = broadcastNotifications.some(bn => bn.id === n.id);
                
                if (isPrivate && !n.read) {
                    const ref = doc(db, "notifications", n.id);
                    batch.update(ref, { read: true });
                } else if (isBroadcast && !readReceipts.has(n.id)) {
                    const receiptRef = doc(db, "users", user.id, "read_notifications", n.id);
                    batch.set(receiptRef, {});
                }
            });
            
            await batch.commit();
        } catch (error) {
            console.error("Erro ao marcar notificações como lidas", error);
        }
    };

    const handleMarkNotificationAsRead = async (id: string) => {
        if (!user) return;
        try {
            const isPrivate = privateNotifications.some(pn => pn.id === id);
            
            if (isPrivate) {
                const ref = doc(db, "notifications", id);
                await updateDoc(ref, { read: true });
                setPrivateNotifications(prev => prev.filter(n => n.id !== id));
            } else {
                const receiptRef = doc(db, "users", user.id, "read_notifications", id);
                await setDoc(receiptRef, {});
                setReadReceipts(prev => new Set(prev).add(id));
            }
        } catch (error) {
            console.error("Erro ao marcar notificação como lida", error);
        }
    };

    return {
        notifications,
        unreadNotificationCount,
        handleMarkAllNotificationsRead,
        handleMarkNotificationAsRead
    };
}
