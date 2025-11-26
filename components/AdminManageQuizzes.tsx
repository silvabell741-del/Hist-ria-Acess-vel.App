
import React, { useState, useMemo } from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { Quiz } from '../types';
import { Modal } from './common/Modal';
import { QuizView } from './QuizView';

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

const QuizRow: React.FC<{ quiz: Quiz; onView: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: () => void; }> = ({ quiz, onView, onEdit, onDelete, onStatusChange }) => {
    const statusColor = quiz.status === 'Ativo'
        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    
    const { modules } = useAdminData();
    const moduleTitle = useMemo(() => {
        if (!quiz.moduleId) return '-';
        const mod = modules.find(m => m.id === quiz.moduleId);
        return mod ? mod.title : 'Módulo não encontrado';
    }, [modules, quiz.moduleId]);

    return (
        <tr className="border-b border-slate-200 dark:border-slate-700 last:border-0 hc-border-override">
            <td className="p-4 align-top font-semibold text-slate-800 dark:text-slate-100 hc-text-primary">{quiz.title}</td>
            <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">{moduleTitle}</td>
            <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">{quiz.createdBy}</td>
            <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">{quiz.questions.length}</td>
            <td className="p-4 align-top">
                 <button
                    onClick={onStatusChange}
                    title={`Mudar status para ${quiz.status === 'Ativo' ? 'Inativo' : 'Ativo'}`}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${statusColor} hover:ring-2 hover:ring-offset-1 dark:ring-offset-slate-800 ${quiz.status === 'Ativo' ? 'hover:ring-green-400' : 'hover:ring-slate-400'}`}>
                    {quiz.status}
                </button>
            </td>
            <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">{quiz.date}</td>
            <td className="p-4 align-top">
                <div className="flex items-center space-x-2">
                     <button onClick={onView} aria-label={`Visualizar quiz ${quiz.title}`} className="p-3 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md dark:hover:bg-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                     <button onClick={onEdit} aria-label={`Editar quiz ${quiz.title}`} className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md dark:hover:bg-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg></button>
                     <button onClick={onDelete} aria-label={`Excluir quiz ${quiz.title}`} className="p-3 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md dark:hover:bg-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </td>
        </tr>
    );
};

const AdminManageQuizzes: React.FC = () => {
    const { quizzes, handleDeleteQuiz, handleUpdateQuiz } = useAdminData();
    const { setCurrentPage, startEditingQuiz } = useNavigation();
    const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);

    const activeCount = quizzes.filter(q => q.status === 'Ativo').length;
    const withModuleCount = quizzes.filter(q => q.moduleId && q.moduleId !== '-').length;
    const independentCount = quizzes.length - withModuleCount;

    const onDeleteQuiz = (quizId: string) => {
        if (window.confirm("Tem certeza que deseja apagar este quiz? Esta ação não pode ser desfeita.")) {
            handleDeleteQuiz(quizId);
        }
    };

    const onStatusChange = async (quiz: Quiz) => {
        const newStatus: 'Ativo' | 'Inativo' = quiz.status === 'Ativo' ? 'Inativo' : 'Ativo';
        const updatedQuiz = { ...quiz, status: newStatus };
        await handleUpdateQuiz(updatedQuiz);
    };

    return (
        <div className="space-y-8">
             <div className="flex justify-end items-center gap-4">
                <button 
                    onClick={() => setCurrentPage('admin_create_quiz')}
                    className="flex items-center justify-center px-4 py-2 bg-blue-200 text-blue-900 font-semibold rounded-lg shadow-sm hover:bg-blue-300 transition-colors dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override">
                    <div className="h-5 w-5 mr-2">{ICONS.plus}</div>
                    <span>Novo Quiz</span>
                </button>
            </div>
            
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <li><StatCard title="Total" value={quizzes.length} icon={ICONS.quizzes} iconBgColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" /></li>
                <li><StatCard title="Ativos" value={activeCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>} iconBgColor="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300" /></li>
                <li><StatCard title="Com Módulo" value={withModuleCount} icon={ICONS.modules} iconBgColor="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300" /></li>
                <li><StatCard title="Independentes" value={independentCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2-2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>} iconBgColor="bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300" /></li>
            </ul>

            <Card className="overflow-x-auto !p-0">
                <div className="p-6 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center hc-text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Lista de Quizzes
                    </h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 hc-text-secondary">
                            <th className="p-4">Título</th>
                            <th className="p-4">Módulo</th>
                            <th className="p-4">Criado por</th>
                            <th className="p-4">Perguntas</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Data</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quizzes.map(quiz => <QuizRow key={quiz.id} quiz={quiz} onView={() => setViewingQuiz(quiz)} onEdit={() => startEditingQuiz(quiz)} onDelete={() => onDeleteQuiz(quiz.id)} onStatusChange={() => onStatusChange(quiz)} />)}
                    </tbody>
                </table>
            </Card>

            {viewingQuiz && (
                <Modal isOpen={!!viewingQuiz} onClose={() => setViewingQuiz(null)} title={viewingQuiz.title}>
                    <div className="max-h-[70vh] overflow-y-auto p-1">
                        <QuizView quiz={viewingQuiz} onQuizComplete={async () => 0} />
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminManageQuizzes;
