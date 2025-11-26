
import React, { useState, useMemo } from 'react';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useNavigation } from '../contexts/NavigationContext';
import { Module } from '../types';

const ModuleDraftCard: React.FC<{ 
    module: Module; 
    onPublish: (module: Module) => void; 
    onEdit: (module: Module) => void;
    onDelete: (id: string) => void; 
}> = ({ module, onPublish, onEdit, onDelete }) => (
    <Card className="hover:shadow-md transition-shadow border border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10">
        <div className="flex justify-between items-start">
            <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">RASCUNHO</span>
                    {module.createdAt && <span className="text-xs text-slate-500 dark:text-slate-400">Criado em: {new Date(module.createdAt).toLocaleDateString('pt-BR')}</span>}
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 hc-text-primary line-clamp-1">{module.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary line-clamp-2 mt-1">{module.description}</p>
                
                <div className="flex items-center gap-3 mt-3 text-xs font-medium">
                    {module.materia && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{Array.isArray(module.materia) ? module.materia.join(', ') : module.materia}</span>}
                    {module.series && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{Array.isArray(module.series) ? module.series.join(', ') : module.series}</span>}
                    <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">{module.pages?.length || 0} páginas</span>
                </div>
            </div>
            <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                <button 
                    onClick={() => onPublish(module)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors shadow-sm hc-button-primary-override flex items-center justify-center"
                    title="Publicar Agora"
                >
                    Publicar
                </button>
                <button 
                    onClick={() => onEdit(module)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-semibold rounded hover:bg-indigo-100 transition-colors border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
                    title="Editar Rascunho"
                >
                    Editar
                </button>
                <button 
                    onClick={() => onDelete(module.id)}
                    className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-sm font-semibold rounded hover:bg-red-50 dark:bg-slate-800 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors hc-button-override"
                    title="Excluir Rascunho"
                >
                    Excluir
                </button>
            </div>
        </div>
    </Card>
);

const PublishModuleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    module: Module | null;
    onPublish: (classIds: string[]) => Promise<void>;
}> = ({ isOpen, onClose, module, onPublish }) => {
    const { teacherClasses } = useTeacherClassContext();
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleClassSelection = (classId: string) => {
        setSelectedClassIds(prev => 
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const handlePublish = async () => {
        if (selectedClassIds.length === 0) return;
        setIsSubmitting(true);
        await onPublish(selectedClassIds);
        setIsSubmitting(false);
        onClose();
    };

    if (!module) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Publicar Módulo: ${module.title}`}>
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Selecione as turmas que terão acesso a este módulo. O módulo deixará de ser um rascunho e ficará visível para os alunos selecionados.
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Turmas <span className="text-red-500">*</span>
                    </label>
                    <div className="max-h-60 overflow-y-auto p-2 border rounded-md dark:border-slate-600 bg-white dark:bg-slate-700">
                        {teacherClasses.length === 0 ? (
                            <p className="text-sm text-slate-500">Nenhuma turma encontrada.</p>
                        ) : (
                            teacherClasses.map(c => (
                                <label key={c.id} className="flex items-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedClassIds.includes(c.id)}
                                        onChange={() => handleClassSelection(c.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="ml-3 text-sm text-gray-700 dark:text-slate-300">{c.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedClassIds.length} turmas selecionadas.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePublish} 
                        disabled={selectedClassIds.length === 0 || isSubmitting}
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

const TeacherModuleRepository: React.FC = () => {
    const { draftModules, handleDeleteModule, handlePublishModuleDraft } = useTeacherAcademicContext();
    const { startEditingModule, setCurrentPage } = useNavigation();
    const [selectedDraft, setSelectedDraft] = useState<Module | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredDrafts = useMemo(() => {
        return draftModules.filter(draft => 
            draft.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            draft.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [draftModules, searchTerm]);

    const handleDelete = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este rascunho de módulo permanentemente?")) {
            await handleDeleteModule('draft', id); 
        }
    };

    const handlePublishClick = (module: Module) => {
        setSelectedDraft(module);
        setIsModalOpen(true);
    };

    const handlePublishConfirm = async (classIds: string[]) => {
        if (selectedDraft) {
            await handlePublishModuleDraft(selectedDraft.id, classIds);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <button
                    onClick={() => setCurrentPage('teacher_create_module')}
                    className="flex items-center justify-center px-4 py-2 bg-blue-200 text-blue-900 font-semibold rounded-lg shadow-sm hover:bg-blue-300 transition-colors dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override"
                >
                    <div className="h-5 w-5 mr-2">{ICONS.plus}</div>
                    <span>Novo Módulo</span>
                </button>
            </div>
            
            <Card className="p-4 bg-slate-50 dark:bg-slate-800/50">
                <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar rascunhos de módulos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                </div>
            </Card>

            {filteredDrafts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredDrafts.map(draft => (
                        <ModuleDraftCard 
                            key={draft.id} 
                            module={draft} 
                            onPublish={handlePublishClick} 
                            onEdit={startEditingModule}
                            onDelete={handleDelete} 
                        />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-16 border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="inline-block p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm">
                        <div className="text-amber-400">{ICONS.modules}</div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Nenhum rascunho de módulo encontrado</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                        {draftModules.length > 0 
                            ? "Tente ajustar a busca para encontrar o que procura."
                            : "Quando você criar um módulo e escolher 'Salvar Rascunho', ele aparecerá aqui."
                        }
                    </p>
                </Card>
            )}

            <PublishModuleModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                module={selectedDraft}
                onPublish={handlePublishConfirm}
            />
        </div>
    );
};

export default TeacherModuleRepository;
