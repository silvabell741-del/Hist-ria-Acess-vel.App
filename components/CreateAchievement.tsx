import React, { useState, useEffect } from 'react';
import type { Achievement } from '../types';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';
import { useNavigation } from '../contexts/NavigationContext';

const InputField: React.FC<{ label: string, required?: boolean, children: React.ReactNode, helperText?: string }> = ({ label, required, children, helperText }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {helperText && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 hc-text-secondary">{helperText}</p>}
    </div>
);

const CreateAchievement: React.FC = () => {
    const { handleSaveAchievement, handleUpdateAchievement, handleDeleteAchievement, isSubmitting } = useAdminData();
    const { setCurrentPage, editingAchievement, exitEditingAchievement } = useNavigation();
    
    const isEditMode = !!editingAchievement;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [points, setPoints] = useState(10);
    const [criterionType, setCriterionType] = useState<'modules' | 'quizzes' | 'activities'>('modules');
    const [criterionCount, setCriterionCount] = useState(1);
    const [category, setCategory] = useState<'social' | 'learning' | 'engagement'>('learning');
    const [rarity, setRarity] = useState<'common' | 'rare' | 'epic'>('common');
    const [status, setStatus] = useState<'Ativa' | 'Inativa'>('Ativa');
    const [action, setAction] = useState<'save' | 'delete' | null>(null);
    
    useEffect(() => {
        if (isEditMode && editingAchievement) {
            setTitle(editingAchievement.title);
            setDescription(editingAchievement.description);
            setPoints(editingAchievement.points);
            setCriterionType(editingAchievement.criterionType || 'modules');
            setCriterionCount(editingAchievement.criterionCount || 1);
            setCategory(editingAchievement.category || 'learning');
            setRarity(editingAchievement.rarity || 'common');
            setStatus(editingAchievement.status || 'Ativa');
        }
    }, [isEditMode, editingAchievement]);

    const handleSave = async () => {
        if (!title || !description || action) return;

        setAction('save');
        const criterionTextMap = {
            modules: `Completar ${criterionCount} módulo(s)`,
            quizzes: `Completar ${criterionCount} quiz(zes)`,
            activities: `Enviar ${criterionCount} atividade(s)`,
        };

        const achievementData = {
            title,
            description,
            points,
            criterion: criterionTextMap[criterionType],
            criterionType: criterionType,
            criterionCount: criterionCount,
            category,
            rarity,
            status,
        };
        
        const tier = rarity === 'epic' ? 'gold' : rarity === 'rare' ? 'silver' : 'bronze';

        try {
            if (isEditMode && editingAchievement) {
                await handleUpdateAchievement({
                    ...achievementData,
                    tier,
                    id: editingAchievement.id,
                    unlocked: editingAchievement.unlocked,
                    date: editingAchievement.date,
                });
                exitEditingAchievement();
            } else {
                await handleSaveAchievement({ ...achievementData, tier } as Omit<Achievement, 'id'>);
                setCurrentPage('admin_achievements');
            }
        } finally {
            setAction(null);
        }
    };

    const handleCancel = () => {
        if (isEditMode) {
            exitEditingAchievement();
        } else {
            setCurrentPage('admin_achievements');
        }
    };
    
    const handleDelete = async () => {
        if (!editingAchievement || action) return;

        if (window.confirm(`Tem certeza que deseja excluir a conquista "${editingAchievement.title}"? Esta ação é irreversível.`)) {
            setAction('delete');
            try {
                await handleDeleteAchievement(editingAchievement.id);
                exitEditingAchievement();
            } catch (error) {
                // Toast is shown in context, error is logged for debugging
                console.error("Deletion failed:", error);
            } finally {
                setAction(null);
            }
        }
    };

    const isFormValid = title.trim() !== '' && description.trim() !== '' && criterionCount > 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center -mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{isEditMode ? 'Editar Conquista' : 'Criar Conquista'}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">{isEditMode ? 'Altere os detalhes desta conquista.' : 'Defina uma nova medalha para os alunos desbloquearem.'}</p>
                </div>
                <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override">
                    Voltar
                </button>
            </div>

            <Card>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6 flex items-center hc-text-primary hc-border-override">
                    {ICONS.achievements}
                    <span className="ml-2">Detalhes da Conquista</span>
                </h3>
                <fieldset disabled={action !== null} className="space-y-6">
                    <InputField label="Título" required>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>
                    <InputField label="Descrição" required>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Tipo de Critério" required>
                            <select value={criterionType} onChange={e => setCriterionType(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                <option value="modules">Módulos Concluídos</option>
                                <option value="quizzes">Quizzes Concluídos</option>
                                <option value="activities">Atividades Enviadas</option>
                            </select>
                        </InputField>
                        <InputField label="Quantidade Necessária" required>
                            <input type="number" value={criterionCount} onChange={e => setCriterionCount(Math.max(1, Number(e.target.value)))} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </InputField>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <InputField label="Pontos">
                            <input type="number" value={points} onChange={e => setPoints(Number(e.target.value) >= 0 ? Number(e.target.value) : 0)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </InputField>
                        <InputField label="Categoria">
                             <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                <option value="learning">Aprendizagem</option>
                                <option value="engagement">Engajamento</option>
                                <option value="social">Social</option>
                            </select>
                        </InputField>
                         <InputField label="Raridade">
                             <select value={rarity} onChange={e => setRarity(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                <option value="common">Comum</option>
                                <option value="rare">Rara</option>
                                <option value="epic">Épica</option>
                            </select>
                        </InputField>
                         <InputField label="Status">
                             <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                <option value="Ativa">Ativa</option>
                                <option value="Inativa">Inativa</option>
                            </select>
                        </InputField>
                    </div>
                </fieldset>
            </Card>

             <div className="flex justify-between items-center">
                <div>
                    {isEditMode && (
                        <button
                            onClick={handleDelete}
                            disabled={action !== null}
                            className="px-4 py-2 bg-red-100 text-red-800 font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
                        >
                             {action === 'delete' ? <SpinnerIcon className="h-5 w-5" /> : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                             )}
                            <span>{action === 'delete' ? 'Excluindo...' : 'Excluir'}</span>
                        </button>
                    )}
                </div>
                <div className="flex space-x-4">
                    <button onClick={handleCancel} disabled={action !== null} className="px-6 py-2 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={!isFormValid || action !== null} className="px-6 py-2 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40 hc-button-primary-override">
                         {action === 'save' ? <SpinnerIcon className="h-5 w-5 text-green-900 dark:text-green-200" /> : <div className="h-5 w-5">{ICONS.plus}</div>}
                        <span>{action === 'save' ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Salvar Conquista')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateAchievement;
