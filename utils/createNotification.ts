
import { db } from "../components/firebaseClient";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, updateDoc, doc } from "firebase/firestore";
import type { Page } from "../types";

export type NotificationType = 
  | "activity_post" 
  | "activity_submission" 
  | "module_post" 
  | "notice_post"
  | "activity_correction";

interface CreateNotificationParams {
  userId: string;    // Quem recebe
  actorId: string;   // Quem gerou
  actorName: string;
  type: NotificationType;
  title: string;
  text: string;
  classId: string;
  activityId?: string;
  moduleId?: string;
  noticeId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    // Lógica de Agrupamento para Correções (Anti-Spam)
    // Se o professor corrigir várias atividades em < 5 minutos, agrupa na última notificação.
    if (params.type === 'activity_correction') {
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", params.userId),
            where("type", "==", "activity_correction"),
            where("read", "==", false), // Apenas agrupa se o aluno ainda não leu
            orderBy("timestamp", "desc"),
            limit(1)
        );
        
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const existingDoc = snap.docs[0];
            const data = existingDoc.data();
            
            // Calcula diferença de tempo
            let docTime = new Date();
            if (data.timestamp?.toDate) {
                docTime = data.timestamp.toDate();
            } else if (typeof data.timestamp === 'string') {
                docTime = new Date(data.timestamp);
            }
            
            const timeDiff = Date.now() - docTime.getTime();
            const FIVE_MINUTES = 5 * 60 * 1000;

            if (timeDiff < FIVE_MINUTES) {
                // Atualiza a notificação existente
                const currentCount = data.groupCount || 1;
                const newCount = currentCount + 1;
                
                await updateDoc(doc(db, "notifications", existingDoc.id), {
                    title: `${newCount} Atividades Corrigidas`,
                    text: `Você possui ${newCount} atividades corrigidas recentemente. Verifique suas notas e feedbacks.`,
                    groupCount: newCount,
                    timestamp: serverTimestamp(), // Traz para o topo
                    urgency: 'high'
                });
                return; // Interrompe a criação de uma nova
            }
        }
    }

    let deepLink: { page: Page; id?: string } = { page: 'dashboard' };
    let urgency: 'low' | 'medium' | 'high' = 'medium';

    // Configuração automática baseada no tipo
    switch (params.type) {
      case 'activity_post':
        deepLink = { page: 'activities' };
        urgency = 'high';
        break;
      case 'activity_submission':
        deepLink = { page: 'teacher_pending_activities' }; // Vai para pendências
        urgency = 'high';
        break;
      case 'module_post':
        deepLink = { page: 'modules', id: params.moduleId };
        urgency = 'medium';
        break;
      case 'notice_post':
        deepLink = { page: 'join_class' }; // Geralmente onde se vê avisos da turma
        urgency = 'medium';
        break;
      case 'activity_correction':
        deepLink = { page: 'activities' }; // Aluno vê o feedback na lista de atividades
        urgency = 'high';
        break;
    }

    const payload = {
      userId: params.userId,
      actorId: params.actorId,
      actorName: params.actorName,
      type: params.type,
      title: params.title,
      text: params.text,       // Estrutura solicitada
      summary: params.text,    // Mantendo compatibilidade com UI existente
      deepLink,
      urgency,
      classId: params.classId,
      activityId: params.activityId || null,
      moduleId: params.moduleId || null,
      noticeId: params.noticeId || null,
      groupCount: 1, // Inicia contagem de grupo
      read: false,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, "notifications"), payload);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
  }
}