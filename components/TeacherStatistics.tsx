
import React, { useState, useMemo } from 'react';
import type { TeacherClass } from '../types';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';

const StatCard: React.FC<{ title: string; value: string | number; description: string; icon: React.ReactNode; iconBgColor: string; iconTextColor: string }> = React.memo(({ title, value, description, icon, iconBgColor, iconTextColor }) => (
    <Card>
        <div className="flex justify-between items-start">
            <div>
                <p className="font-semibold text-slate-600 dark:text-slate-300 hc-text-secondary">{title}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-1 hc-text-primary responsive-stat-value">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">{description}</p>
            </div>
            <div className={`p-3 rounded-full ${iconBgColor} ${iconTextColor}`}>
                {icon}
            </div>
        </div>
    </Card>
));

const TeacherStatistics: React.FC = () => {
    const { teacherClasses } = useTeacherClassContext();
    const [selectedClassId, setSelectedClassId] = useState('all');

    const stats = useMemo(() => {
        const filteredClasses = selectedClassId === 'all' 
            ? teacherClasses 
            : teacherClasses.filter(c => c.id === selectedClassId);

        const allStudents = filteredClasses.flatMap(c => c.students || []);
        const uniqueStudentIds = new Set(allStudents.map(s => s.id));
        const totalStudents = uniqueStudentIds.size;
        
        // Calculate average activity performance
        let totalScore = 0;
        let totalMaxScore = 0;
        filteredClasses.forEach(c => {
            c.activities?.forEach(a => {
                if (a.submissions) {
                    a.submissions.forEach(s => {
                        if (s.status === 'Corrigido' && typeof s.grade === 'number' && a.points > 0) {
                            totalScore += s.grade;
                            totalMaxScore += a.points;
                        }
                    });
                }
            });
        });
        const averageActivityPerformance = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
        
        // Calculate active students and engagement rate
        const allSubmissions = filteredClasses.flatMap(c => c.activities || []).flatMap(a => a.submissions || []);
        const studentIdsWithSubmissions = new Set(allSubmissions.map(s => s.studentId));
        const activeStudents = studentIdsWithSubmissions.size;
        const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
        
        return {
            totalStudents,
            averageActivityPerformance,
            activeStudents,
            engagementRate,
        };
    }, [teacherClasses, selectedClassId]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Estatísticas do Professor</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">Acompanhe o progresso e desempenho dos seus alunos</p>
                </div>
                <select 
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                    <option value="all">Todas as Turmas</option>
                    {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <li><StatCard title="Total de Alunos" value={stats.totalStudents} description="Em todas as turmas selecionadas" icon={ICONS.students} iconBgColor="bg-blue-100 dark:bg-blue-500/20" iconTextColor="text-blue-600 dark:text-blue-300" /></li>
                <li><StatCard title="Média em Atividades" value={`${stats.averageActivityPerformance}%`} description="Desempenho médio nas atividades" icon={ICONS.stats_quiz} iconBgColor="bg-yellow-100 dark:bg-yellow-500/20" iconTextColor="text-yellow-600 dark:text-yellow-300" /></li>
                <li><StatCard title="Alunos Ativos" value={stats.activeStudents} description="Enviaram ao menos 1 atividade" icon={ICONS.stats_active} iconBgColor="bg-indigo-100 dark:bg-indigo-500/20" iconTextColor="text-indigo-600 dark:text-indigo-300" /></li>
                <li><StatCard title="Taxa de Engajamento" value={`${stats.engagementRate}%`} description="Alunos ativos / Total" icon={ICONS.stats_engagement} iconBgColor="bg-red-100 dark:bg-red-500/20" iconTextColor="text-red-600 dark:text-red-300" /></li>
            </ul>

        </div>
    );
};

export default TeacherStatistics;
