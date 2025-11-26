
import { db } from "../components/firebaseClient";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
import type { Achievement, UserAchievementsDoc } from "../types";

export const USER_ACHIEVEMENTS_COLLECTION = "userAchievements";

/**
 * Busca todas as conquistas globais ativas.
 * Removido o cache de sessão manual para garantir que novas conquistas
 * criadas pelo administrador apareçam sem necessidade de limpar dados do navegador.
 */
export async function fetchGlobalAchievements(): Promise<Achievement[]> {
  try {
    const q = query(collection(db, "achievements"), where("status", "==", "Ativa"));
    const snap = await getDocs(q);
    
    const achievements = snap.docs.map(d => ({ id: d.id, ...d.data() } as Achievement));
    
    return achievements;
  } catch (error) {
    console.error("Erro ao buscar conquistas globais:", error);
    return [];
  }
}

/**
 * Busca o documento único do usuário (Single Source of Truth)
 * Contém XP, Nível, Stats e IDs das conquistas desbloqueadas.
 * Se o documento não existir, cria um inicial.
 */
export async function fetchUserAchievementsDoc(userId: string): Promise<UserAchievementsDoc> {
  if (!userId) throw new Error("UserID is required");

  const ref = doc(db, USER_ACHIEVEMENTS_COLLECTION, userId);

  try {
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return snap.data() as UserAchievementsDoc;
    } else {
      // Inicialização Lazy: Cria o documento se for a primeira vez
      const initialData: UserAchievementsDoc = {
        xp: 0,
        level: 1,
        stats: {
          quizzesCompleted: 0,
          modulesCompleted: 0,
          activitiesCompleted: 0,
          loginStreak: 0
        },
        unlocked: {}, // Mapa vazio
        updatedAt: serverTimestamp()
      };
      
      await setDoc(ref, initialData);
      return initialData;
    }
  } catch (error) {
    console.error("Erro ao buscar documento de conquistas do usuário:", error);
    // Fallback seguro para não quebrar a UI
    return { xp: 0, level: 1, stats: { quizzesCompleted: 0, modulesCompleted: 0, activitiesCompleted: 0, loginStreak: 0 }, unlocked: {} };
  }
}

// Registra/unlock de forma atômica por documento (Mantido para compatibilidade, mas será movido para a Engine na Fase 2)
export async function recordAchievementUnlock(userId: string, achievementId: string, extra: Record<string, any> = {}) {
  try {
    const ref = doc(db, USER_ACHIEVEMENTS_COLLECTION, userId);
    // Note: Na Fase 1, apenas garantimos que a estrutura suporta o unlock via merge
    const payload = {
      [`unlocked.${achievementId}`]: {
        date: new Date().toISOString(),
        seen: false,
        ...extra
      },
      updatedAt: serverTimestamp()
    };
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    console.error("Error recording achievement unlock:", error);
  }
}
