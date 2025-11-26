
import React from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { Achievement } from '../types';

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; iconBgColor: string }> = ({ title, value, icon, iconBgColor }) => (
    <Card>
        <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${iconBgColor}`}>
                {icon}
            </div>
            <div>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">{title}</p>
            </div>
        </div>
    </Card>
);

const AchievementRow: React.FC<{ achievement: Achievement; onEdit: () => void; onDelete: () => void; }> = ({ achievement, onEdit, onDelete }) => {
    const statusColor = achievement.status === 'Ativa' 
        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    
    const rarityColors = {
        common: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
        rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    };

    const categoryColors = {
        social: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
        learning: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
        engagement: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    };

    return (
        <tr className="border-b border-slate-200 dark:border-slate-700 last:border-0 hc-border-override">
            <td className="p-4 align-top">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl" aria-hidden="true">🏆</span>
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 hc-text-primary">{achievement.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 hc-text-secondary">{achievement.description}</p>
                    </div>
                </div>
            </td>
            <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">{achievement.criterion}</td>
            <td className="p-4 align-top">
                 {achievement.category && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[achievement.category]}`}>{achievement.category}</span>}
            </td>
            <td className="p-4 align-top">
                 {achievement.rarity && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rarityColors[achievement.rarity]}`}>{achievement.rarity}</span>}
            </td>
            <td className="p-4 align-top text-sm font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">{achievement.points}</td>
            <td className="p-4 align-top">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>{achievement.status}</span>
            </td>
            <td className="p-4 align-top">
                <div className="flex items-center space-x-2">
                     <button onClick={onEdit} aria-label={`Editar conquista ${achievement.title}`} className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md dark:hover:bg-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg></button>
                     <button onClick={onDelete} aria-label={`Excluir conquista ${achievement.title}`} className="p-3 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md dark:hover:bg-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </td>
        </tr>
    );
};

const AdminManageAchievements: React.FC = () => {
    const { achievements, handleDeleteAchievement } = useAdminData();
    const { setCurrentPage, startEditingAchievement } = useNavigation();
    const activeCount = achievements.filter(a => a.status === 'Ativa').length;
    const inactiveCount = achievements.length - activeCount;
    
    const onDeleteAchievement = (achievementId: string) => {
        if (window.confirm("Tem certeza que deseja apagar esta conquista? Esta ação não pode ser desfeita.")) {
            handleDeleteAchievement(achievementId);
        }
    };
    
    const onEditAchievement = (achievement: Achievement) => {
        startEditingAchievement(achievement);
    };

    return (
        <div className="space-y-8">
             <div className="flex justify-end items-center gap-4">
                <button 
                    onClick={() => setCurrentPage('admin_create_achievement')}
                    className="flex items-center justify-center px-4 py-2 bg-blue-200 text-blue-900 font-semibold rounded-lg shadow-sm hover:bg-blue-300 transition-colors dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override">
                    <div className="h-5 w-5 mr-2">{ICONS.plus}</div>
                    <span>Nova Conquista</span>
                </button>
            </div>
            
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <li><StatCard title="Total" value={achievements.length} icon={ICONS.achievements} iconBgColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" /></li>
                <li><StatCard title="Ativas" value={activeCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>} iconBgColor="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300" /></li>
                <li><StatCard title="Inativas" value={inactiveCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>} iconBgColor="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" /></li>
            </ul>

            <Card className="overflow-x-auto !p-0">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 p-6 flex items-center hc-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    Lista de Conquistas
                </h3>
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 hc-text-secondary">
                            <th className="p-4">Conquista</th>
                            <th className="p-4">Critério</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4">Raridade</th>
                            <th className="p-4">Pontos</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {achievements.map(ach => <AchievementRow key={ach.id} achievement={ach} onEdit={() => onEditAchievement(ach)} onDelete={() => onDeleteAchievement(ach.id)} />)}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default AdminManageAchievements;
