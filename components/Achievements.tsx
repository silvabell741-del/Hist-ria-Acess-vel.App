
import React, { useMemo, useEffect } from 'react';
import type { Achievement } from '../types';
import { useStudentGamificationContext } from '../contexts/StudentGamificationContext';


const AchievementCard: React.FC<{ achievement: Achievement }> = React.memo(({ achievement }) => {
    return (
        <div className="flex flex-col items-center text-center transition-all duration-300 transform p-5 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 shadow-sm hover:-translate-y-1 hover:shadow-lg">
            <span className="text-5xl" aria-hidden="true">🏆</span>
            <h3 className="mt-4 font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{achievement.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 h-10 hc-text-secondary">{achievement.description}</p>
            <div className="mt-4 w-full flex-grow flex flex-col justify-end">
                <div className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 font-semibold py-1 px-3 rounded-full text-sm">
                    ✓ Conquistada
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{achievement.date}</p>
                <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mt-1">+{achievement.points} pontos</p>
            </div>
        </div>
    );
});

const LockedAchievementCard: React.FC<{ achievement: Achievement }> = React.memo(({ achievement }) => (
    <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm opacity-80">
        <span className="text-5xl filter grayscale" aria-hidden="true">🔒</span>
        <h3 className="mt-4 font-bold text-slate-700 dark:text-slate-300 hc-text-primary">{achievement.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 h-10 hc-text-secondary">{achievement.description}</p>
        <div className="mt-4 w-full flex-grow flex flex-col justify-end">
            <div className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-2 px-3 rounded-lg text-sm">
                <p className="font-bold">Como Desbloquear:</p>
                <p>{achievement.criterion}</p>
            </div>
            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mt-2">+{achievement.points} pontos</p>
        </div>
    </div>
));


const Achievements: React.FC = () => {
    const { achievements, userStats, loadGamificationData } = useStudentGamificationContext();

    // Força atualização ao entrar na tela para pegar novas conquistas criadas pelo admin
    useEffect(() => {
        loadGamificationData();
    }, [loadGamificationData]);

    const unlockedAchievements = useMemo(() => achievements.filter(a => a.unlocked), [achievements]);
    // Mostra as conquistas que não foram desbloqueadas mas que estão ativas no sistema
    const lockedAchievements = useMemo(() => achievements.filter(a => !a.unlocked && a.status === 'Ativa'), [achievements]);

    const unlockedCount = unlockedAchievements.length;
    const totalCount = achievements.length;
    const progressPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
    const lockedCount = totalCount - unlockedCount;
    const totalPoints = userStats.xp;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="flex items-center space-x-3 text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">
                    <span className="text-3xl" aria-hidden="true">🏆</span>
                    <span>Suas Conquistas</span>
                </h2>
            </div>
            
            <div className="p-6 rounded-2xl shadow-lg bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/30 dark:via-amber-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-800/50 text-center">
                <div className="inline-block p-4 bg-white/60 dark:bg-slate-800/50 rounded-full shadow-inner">
                     <span className="text-6xl" aria-hidden="true">🏆</span>
                </div>
                <h3 className="text-4xl font-bold mt-4 text-slate-800 dark:text-slate-100">{unlockedCount} / {totalCount} Conquistas</h3>
                <div className="mt-4 px-4">
                    <div className="flex justify-between items-center mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <span>{progressPercentage}% Completo</span>
                    </div>
                    <div className="w-full bg-black/10 dark:bg-black/20 rounded-full h-3" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-yellow-200/50 dark:border-yellow-500/20">
                    <div>
                        <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{totalPoints}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Pontos Ganhos</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{unlockedCount}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Desbloqueadas</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-slate-600 dark:text-slate-300">{lockedCount}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Para Desbloquear</p>
                    </div>
                </div>
            </div>

            <div>
                 <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">
                    Conquistas Desbloqueadas ({unlockedCount})
                </h3>
                {unlockedAchievements.length > 0 ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {unlockedAchievements.map(ach => <li key={ach.id}><AchievementCard achievement={ach} /></li>)}
                    </ul>
                ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8">Você ainda não desbloqueou nenhuma conquista. Continue explorando!</p>
                )}
            </div>

            {lockedAchievements.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">
                        Próximas Conquistas
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {lockedAchievements.map(ach => <li key={ach.id}><LockedAchievementCard achievement={ach} /></li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Achievements;
