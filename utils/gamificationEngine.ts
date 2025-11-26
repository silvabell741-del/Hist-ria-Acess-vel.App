
import { db } from "../components/firebaseClient";
import { doc, runTransaction, serverTimestamp, increment } from "firebase/firestore";
import type { Achievement, UserGamificationStats, UserAchievementsDoc } from '../types';
import { fetchGlobalAchievements } from './achievements';

/**
 * PURE FUNCTION: Gamification Engine
 * Compara as estatísticas atuais do usuário com as regras globais de conquistas
 * para determinar se houve novos desbloqueios.
 */
export function checkNewAchievements(
    currentStats: UserGamificationStats,
    allAchievements: Achievement[],
    unlockedMap: Record<string, any>
): Achievement[] {
    const newUnlocks: Achievement[] = [];

    // Itera sobre todas as conquistas possíveis
    for (const achievement of allAchievements) {
        
        // 1. Otimização: Se já está no mapa de desbloqueados, pula.
        if (unlockedMap[achievement.id]) {
            continue;
        }

        // 2. Regra de Negócio: Se a conquista está Inativa pelo admin, ignora.
        if (achievement.status === 'Inativa') {
            continue;
        }

        // 3. Verificação de Critérios
        let isUnlocked = false;
        const target = achievement.criterionCount || 0;

        // Evita desbloquear conquistas com critério 0 ou indefinido por segurança
        if (target <= 0) continue;

        switch (achievement.criterionType) {
            case 'quizzes':
                // Ex: Fez 5 quizzes >= Meta de 5
                if ((currentStats.quizzesCompleted || 0) >= target) {
                    isUnlocked = true;
                }
                break;
            
            case 'modules':
                // Ex: Completou 3 módulos >= Meta de 3
                if ((currentStats.modulesCompleted || 0) >= target) {
                    isUnlocked = true;
                }
                break;
            
            case 'activities':
                // Ex: Enviou 10 atividades >= Meta de 10
                if ((currentStats.activitiesCompleted || 0) >= target) {
                    isUnlocked = true;
                }
                break;
            
            // Futuro: Adicionar novos tipos aqui (ex: 'loginStreak', 'xpTotal')
            default:
                break;
        }

        // 4. Se passou na regra, adiciona à lista de "Novas Conquistas"
        if (isUnlocked) {
            // Injetamos a data atual para facilitar o uso imediato na UI
            const achievementWithDate = {
                ...achievement,
                unlocked: true,
                date: new Date().toLocaleDateString('pt-BR') // Data visual para o Toast
            };
            newUnlocks.push(achievementWithDate);
        }
    }

    return newUnlocks;
}

/**
 * Processa um evento de gamificação:
 * 1. Incrementa a estatística relevante e XP.
 * 2. Verifica se novas conquistas foram desbloqueadas.
 * 3. Salva tudo atomicamente no Firestore.
 * 
 * @returns Array de novas conquistas desbloqueadas (para mostrar Toast na UI)
 */
export async function processGamificationEvent(
    userId: string,
    eventType: 'quiz_complete' | 'module_complete' | 'activity_sent',
    xpEarned: number
): Promise<Achievement[]> {
    if (!userId) return [];

    try {
        // 1. Buscar Definições Globais de Conquistas (Cacheada)
        const allAchievements = await fetchGlobalAchievements();
        
        const userAchvRef = doc(db, "userAchievements", userId);
        let newUnlockedAchievements: Achievement[] = [];

        await runTransaction(db, async (transaction) => {
            // 2. Ler documento atual do usuário
            const userDoc = await transaction.get(userAchvRef);
            
            let currentData: UserAchievementsDoc;

            if (!userDoc.exists()) {
                currentData = {
                    xp: 0,
                    level: 1,
                    stats: {
                        quizzesCompleted: 0,
                        modulesCompleted: 0,
                        activitiesCompleted: 0,
                        loginStreak: 0
                    },
                    unlocked: {},
                    updatedAt: serverTimestamp()
                };
            } else {
                currentData = userDoc.data() as UserAchievementsDoc;
            }

            // Inicializa stats se undefined (migração segura)
            if (!currentData.stats) currentData.stats = { quizzesCompleted: 0, modulesCompleted: 0, activitiesCompleted: 0, loginStreak: 0 };
            if (!currentData.unlocked) currentData.unlocked = {};

            // 3. Incrementar Stats baseados no evento
            const nextStats = { ...currentData.stats };
            
            if (eventType === 'quiz_complete') {
                nextStats.quizzesCompleted = (nextStats.quizzesCompleted || 0) + 1;
            } else if (eventType === 'module_complete') {
                nextStats.modulesCompleted = (nextStats.modulesCompleted || 0) + 1;
            } else if (eventType === 'activity_sent') {
                nextStats.activitiesCompleted = (nextStats.activitiesCompleted || 0) + 1;
            }

            // 4. Verificar desbloqueios usando a Engine Pura
            const newlyUnlocked = checkNewAchievements(nextStats, allAchievements, currentData.unlocked);
            
            // 5. Preparar Updates
            const updates: any = {
                stats: nextStats,
                xp: (currentData.xp || 0) + xpEarned,
                updatedAt: serverTimestamp()
            };

            // Calcular novo nível (Ex: a cada 100 XP)
            const newLevel = Math.floor(updates.xp / 100) + 1;
            if (newLevel > currentData.level) {
                updates.level = newLevel;
            }

            // Adicionar novas conquistas ao mapa de desbloqueados
            if (newlyUnlocked.length > 0) {
                newUnlockedAchievements = newlyUnlocked;
                const unlockedMapUpdate = { ...currentData.unlocked };
                
                newlyUnlocked.forEach(ach => {
                    unlockedMapUpdate[ach.id] = {
                        date: new Date().toISOString(),
                        seen: false
                    };
                    // Bônus de XP da conquista
                    updates.xp += (ach.points || 0);
                });
                
                updates.unlocked = unlockedMapUpdate;
            }

            // 6. Salvar no Firestore
            transaction.set(userAchvRef, updates, { merge: true });
        });

        return newUnlockedAchievements;

    } catch (error) {
        console.error("Erro ao processar gamificação:", error);
        return [];
    }
}
