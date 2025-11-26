
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useNavigation } from '../contexts/NavigationContext';
import { Activity } from '../types';

const DraftCard: React.FC<{ 
    activity: Activity; 
    onUse: (activity: Activity) => void; 
    onEdit: (activity: Activity) => void;
    onDelete: (id: string) => void; 
}> = ({ activity, onUse, onEdit, onDelete }) => (
    <Card className="hover:shadow-md transition-shadow border border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10">
        <div className="flex justify-between items-start">
            <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">RASCUNHO</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Criado em: {new Date(activity.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 hc-text-primary line-clamp-1">{activity.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary line-clamp-2 mt-1">{activity.description}</p>
                
                <div className="flex items-center gap-3 mt-3 text-xs font-medium">
                    {activity.materia && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{activity.materia}</span>}
                    {activity.unidade && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{activity.unidade}</span>}
                    <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">{activity.type}</span>
                </div>
            </div>
            <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                <button 
                    onClick={() => onUse(activity)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors shadow-sm hc-button-primary-override flex items-center justify-center"
                    title="Publicar Agora"
                >
                    Usar
                </button>
                <button 
                    onClick={() => onEdit(activity)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded hover:bg-indigo-100 transition-colors border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
                    title="Editar Rascunho"
                >
                    Editar
                </button>
                <button 
                    onClick={() => onDelete(activity.id)}
                    className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-sm font-semibold rounded hover:bg-red-50 dark:bg-slate-800 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors hc-button-override"
                    title="Excluir Rascunho"
                >
                    Excluir
                </button>
            </div>
        </div>
    </Card>
);

const PublishModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    activity: Activity | null;
    onPublish: (classId: string, dueDate: string, points: number) => Promise<void>;
}> = ({ isOpen, onClose, activity, onPublish }) => {
    const { teacherClasses } = useTeacherClassContext();
    const [classId, setClassId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [points, setPoints] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sincroniza o estado local quando a atividade selecionada muda
    useEffect(() => {
        if (activity) {
            setPoints(activity.points || 0);
            // Se o rascunho já tiver uma turma vinculada (raro, mas possível), pré-seleciona
            if (activity.classId) setClassId(activity.classId);
            else setClassId('');
            setDueDate('');
        }
    }, [activity]);

    const handlePublish = async () => {
        if (!classId) return;
        setIsSubmitting(true);
        await onPublish(classId, dueDate, points);
        setIsSubmitting(false);
        onClose();
    };

    if (!activity) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Publicar: ${activity.title}`}>
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Escolha a turma e o prazo para transformar este rascunho em uma atividade oficial.
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Turma <span className="text-red-500">*</span>
                    </label>
                    <select 
                        value={classId} 
                        onChange={e => setClassId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Selecione uma turma...</option>
                        {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Prazo de Entrega
                        </label>
                        <input 
                            type="date" 
                            value={dueDate} 
                            onChange={e => setDueDate(e.target.value)} 
                            className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Pontos
                        </label>
                        <input 
                            type="number" 
                            max="10" 
                            value={points} 
                            onChange={e => setPoints(Number(e.target.value))} 
                            className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePublish} 
                        disabled={!classId || isSubmitting}
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                    >
                        {isSubmitting ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                        Publicar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const TeacherRepository: React.FC = () => {
    const { draftActivities, handleDeleteActivity, handlePublishDraft } = useTeacherAcademicContext();
    const { teacherClasses } = useTeacherClassContext();
    const { startEditingActivity, setCurrentPage } = useNavigation();
    const [selectedDraft, setSelectedDraft] = useState<Activity | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMateria, setSelectedMateria] = useState('all');
    const [selectedUnidade, setSelectedUnidade] = useState('all');

    const filteredDrafts = useMemo(() => {
        return draftActivities.filter(draft => {
            const matchesSearch = draft.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  draft.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesMateria = selectedMateria === 'all' || draft.materia === selectedMateria;
            const matchesUnidade = selectedUnidade === 'all' || draft.unidade === selectedUnidade;
            return matchesSearch && matchesMateria && matchesUnidade;
        });
    }, [draftActivities, searchTerm, selectedMateria, selectedUnidade]);

    const uniqueMaterias = useMemo(() => Array.from(new Set(draftActivities.map(a => a.materia).filter(Boolean))), [draftActivities]);
    const uniqueUnidades = useMemo(() => Array.from(new Set(draftActivities.map(a => a.unidade).filter(Boolean))), [draftActivities]);

    const handleDelete = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este rascunho permanentemente?")) {
            await handleDeleteActivity(id);
        }
    };

    const handleUse = (activity: Activity) => {
        setSelectedDraft(activity);
        setIsModalOpen(true);
    };

    const handlePublishConfirm = async (classId: string, dueDate: string, points: number) => {
        if (selectedDraft) {
            const className = teacherClasses.find(c => c.id === classId)?.name || 'Turma';
            await handlePublishDraft(selectedDraft.id, { classId, className, dueDate, points });
        }
    };

    const filterSelectClasses = "w-full md:w-auto p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200";

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <button
                    onClick={() => setCurrentPage('teacher_create_activity')}
                    className="flex items-center justify-center px-4 py-2 bg-blue-200 text-blue-900 font-semibold rounded-lg shadow-sm hover:bg-blue-300 transition-colors dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override"
                >
                    <div className="h-5 w-5 mr-2">{ICONS.plus}</div>
                    <span>Nova Atividade</span>
                </button>
            </div>
            
            <Card className="p-4 flex flex-col md:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-800/50">
                <div className="relative w-full md:flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar rascunhos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                </div>
                <select 
                    value={selectedMateria} 
                    onChange={(e) => setSelectedMateria(e.target.value)}
                    className={filterSelectClasses}
                >
                    <option value="all">Todas as Matérias</option>
                    {uniqueMaterias.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                    value={selectedUnidade} 
                    onChange={(e) => setSelectedUnidade(e.target.value)}
                    className={filterSelectClasses}
                >
                    <option value="all">Todas as Unidades</option>
                    {uniqueUnidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </Card>

            {filteredDrafts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredDrafts.map(draft => (
                        <DraftCard 
                            key={draft.id} 
                            activity={draft} 
                            onUse={handleUse} 
                            onEdit={startEditingActivity}
                            onDelete={handleDelete} 
                        />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-16 border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="inline-block p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm">
                        <div className="text-amber-400">{ICONS.repository}</div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Nenhum rascunho encontrado</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                        {draftActivities.length > 0 
                            ? "Tente ajustar os filtros para encontrar o que procura."
                            : "Quando você criar uma atividade e escolher 'Salvar Rascunho', ela aparecerá aqui para uso futuro."
                        }
                    </p>
                </Card>
            )}

            <PublishModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                activity={selectedDraft}
                onPublish={handlePublishConfirm}
            />
        </div>
    );
};

export default TeacherRepository;
