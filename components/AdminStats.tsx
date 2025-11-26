
import React, { useMemo } from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; iconBgColor: string }> = ({ title, value, icon, iconBgColor }) => (
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

const AdminStats: React.FC = () => {
    const { modules, quizzes } = useAdminData();
    
    const detailedStats = useMemo(() => {
        const publishedModuleCount = modules.filter(m => m.status === 'Ativo').length;

        const totalPages = modules.reduce((acc, mod) => acc + (mod.pages?.length || 0), 0);
        const avgPagesPerModule = modules.length > 0 ? (totalPages / modules.length).toFixed(1) : '0.0';

        const totalQuestions = quizzes.reduce((acc, q) => acc + q.questions.length, 0);
        const avgQuestionsPerQuiz = quizzes.length > 0 ? (totalQuestions / quizzes.length).toFixed(1) : '0.0';

        return {
            publishedModuleCount,
            totalPages,
            avgPagesPerModule,
            totalQuestions,
            avgQuestionsPerQuiz,
        };
    }, [modules, quizzes]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Módulos Publicados" value={detailedStats.publishedModuleCount} icon={ICONS.modules} iconBgColor="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300" />
                <StatCard title="Páginas de Conteúdo" value={detailedStats.totalPages} icon={ICONS.block_paragraph} iconBgColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
                <StatCard title="Questões de Quiz" value={detailedStats.totalQuestions} icon={ICONS.quizzes} iconBgColor="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300" />
            </div>
            <Card>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Densidade do Conteúdo</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{detailedStats.avgPagesPerModule}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Média de Páginas por Módulo</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{detailedStats.avgQuestionsPerQuiz}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Média de Questões por Quiz</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AdminStats;
