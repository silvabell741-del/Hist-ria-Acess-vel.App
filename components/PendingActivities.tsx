
import React, { useState, useMemo } from 'react';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { Card } from './common/Card';
import { useNavigation } from '../contexts/NavigationContext'; // Import Navigation
import type { Activity, PendingActivity } from '../types';
import { db } from './firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

const PendingActivityItem: React.FC<{ item: PendingActivity; onView: () => void }> = ({ item, onView }) => (
    <button 
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors duration-200 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-indigo-500" 
        onClick={onView}
        aria-label={`Corrigir atividade ${item.title} da turma ${item.className}. ${item.pendingCount} submissões pendentes.`}
    >
        <div>
            <p className="font-semibold text-indigo-600 dark:text-indigo-400 hc-link-override">{item.title}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">{item.className}</p>
        </div>
        <div className="text-center flex items-center space-x-4">
            <div className="text-right">
                <p className="font-bold text-xl text-yellow-600 dark:text-yellow-400">{item.pendingCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 hc-text-secondary">Pendente(s)</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
    </button>
);

const PendingActivities: React.FC = () => {
    const { allPendingActivities } = useTeacherAcademicContext();
    const { teacherClasses } = useTeacherClassContext();
    const { startGrading } = useNavigation(); // Use navigation action
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [isLoading, setIsLoading] = useState(false);

    // Use the centralized `allPendingActivities` list and filter it locally.
    const pendingActivities = useMemo((): PendingActivity[] => {
        if (selectedClassId === 'all') {
            return allPendingActivities;
        }
        return allPendingActivities.filter(activity => activity.classId === selectedClassId);
    }, [allPendingActivities, selectedClassId]);

    const handleOpenGrading = async (pendingItem: PendingActivity) => {
        setIsLoading(true);
        try {
            // Fetch minimal activity data to pass to context
            // The full grading view will fetch submissions on its own.
            const activityRef = doc(db, "activities", pendingItem.id);
            const activitySnap = await getDoc(activityRef);
            
            if (activitySnap.exists()) {
                const activityData = { id: activitySnap.id, ...activitySnap.data() } as Activity;
                startGrading(activityData);
            } else {
                alert("Atividade não encontrada.");
            }
        } catch (error) {
            console.error("Error preparing grading:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="!p-4">
                <div className="flex justify-end items-center">
                    <label htmlFor="class-filter" className="text-sm font-medium text-slate-600 dark:text-slate-300 mr-2">Filtrar por turma:</label>
                    <select
                        id="class-filter"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        <option value="all">Todas as Turmas</option>
                        {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </Card>

            <Card className="!p-0">
                <div className="divide-y divide-slate-200 dark:divide-slate-700 hc-border-override">
                    {isLoading && (
                        <div className="p-4 text-center text-indigo-600" role="status" aria-live="polite">
                            Carregando...
                        </div>
                    )}
                    {!isLoading && pendingActivities.length > 0 ? (
                        pendingActivities.map(item => (
                            <PendingActivityItem 
                                key={`${item.id}-${item.classId}`} 
                                item={item} 
                                onView={() => handleOpenGrading(item)} 
                            />
                        ))
                    ) : !isLoading && (
                         <div className="text-center py-20">
                            <div className="inline-block bg-green-100 dark:bg-green-500/20 rounded-full p-5">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Tudo em dia!</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm hc-text-secondary">Nenhuma atividade pendente de correção.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default PendingActivities;
