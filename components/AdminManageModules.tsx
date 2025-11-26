
import React, { useState } from 'react';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { Module } from '../types';

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

const ModuleRow: React.FC<{ 
    module: Module; 
    onEdit: () => void; 
    onDelete: () => void; 
    onStatusChange: () => void;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ module, onEdit, onDelete, onStatusChange, isSelected, onSelect }) => {
    const visibilityColor = module.visibility === 'public' 
        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
        : 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300';
    
    const statusColor = module.status === 'Ativo'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

    // Helper to display series/materia which can now be arrays
    const displaySeries = Array.isArray(module.series) ? module.series.join(', ') : module.series;
    const displayMateria = Array.isArray(module.materia) ? module.materia.join(', ') : module.materia;

    return (
        <tr className={`border-b border-slate-200 dark:border-slate-700 last:border-0 hc-border-override ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
            <td className="p-4 w-4 align-top">
                 <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={onSelect}
                    aria-label={`Selecionar módulo ${module.title}`}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
            </td>
            <td className="p-4 align-top">
                <p className="font-semibold text-slate-800 dark:text-slate-100 hc-text-primary">{module.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 hc-text-secondary line-clamp-1">{module.description}</p>
            </td>
            <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">
                <div className="max-w-[200px] truncate" title={`${displaySeries} • ${displayMateria}`}>
                    {displaySeries} • {displayMateria}
                </div>
            </td>
            <td className="p-4 align-top">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${visibilityColor}`}>{module.visibility === 'public' ? 'Público' : 'Privado'}</span>
            </td>
            <td className="p-4 align-top">
                <button 
                    onClick={onStatusChange}
                    title={`Mudar status para ${module.status === 'Ativo' ? 'Inativo' : 'Ativo'}`}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${statusColor} hover:ring-2 hover:ring-offset-1 dark:ring-offset-slate-800 ${module.status === 'Ativo' ? 'hover:ring-blue-400' : 'hover:ring-slate-400'}`}>
                    {module.status}
                </button>
            </td>
            <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">{module.date}</td>
            <td className="p-4 align-top">
                <div className="flex items-center space-x-2">
                     <button aria-label={`Visualizar módulo ${module.title}`} className="p-3 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md dark:hover:bg-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                     <button onClick={onEdit} aria-label={`Editar módulo ${module.title}`} className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md dark:hover:bg-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg></button>
                     <button onClick={onDelete} aria-label={`Excluir módulo ${module.title}`} className="p-3 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md dark:hover:bg-slate-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </td>
        </tr>
    );
};

const AdminManageModules: React.FC = () => {
    const { modules, totalModulesCount, handleDeleteModule, handleUpdateModule, handleBulkDeleteModules, fetchNextModulesPage, hasMoreModules, isLoadingModules } = useAdminData();
    const { setCurrentPage, startEditingModule } = useNavigation();
    const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
    
    // Estatísticas baseadas na contagem real do servidor e proporções da amostra carregada (estimativa)
    const publicCount = modules.filter(m => m.visibility === 'public').length;
    const privateCount = modules.length - publicCount;
    const publishedCount = modules.filter(m => m.status === 'Ativo').length;

    const isAllSelected = modules.length > 0 && selectedModules.size === modules.length;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedModules(new Set(modules.map(m => m.id)));
        } else {
            setSelectedModules(new Set());
        }
    };

    const handleSelectModule = (moduleId: string) => {
        setSelectedModules(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(moduleId)) {
                newSelection.delete(moduleId);
            } else {
                newSelection.add(moduleId);
            }
            return newSelection;
        });
    };

    const onEdit = (module: Module) => {
        startEditingModule(module);
    };
    
    const onDelete = (moduleId: string) => {
        if (window.confirm("Tem certeza que deseja apagar este módulo? Esta ação não pode ser desfeita.")) {
            handleDeleteModule(moduleId);
        }
    };

     const onDeleteSelected = async () => {
        if (selectedModules.size === 0) return;
        if (window.confirm(`Tem certeza que deseja apagar ${selectedModules.size} ${selectedModules.size > 1 ? 'módulos' : 'módulo'}? Esta ação não pode ser desfeita.`)) {
            await handleBulkDeleteModules(selectedModules);
            setSelectedModules(new Set());
        }
    };

    const onStatusChange = async (module: Module) => {
        const newStatus: 'Ativo' | 'Inativo' = module.status === 'Ativo' ? 'Inativo' : 'Ativo';
        const updatedModule = { ...module, status: newStatus };
        await handleUpdateModule(updatedModule);
    };

    return (
        <div className="space-y-8">
             <div className="flex justify-end items-center gap-4">
                <button 
                    onClick={() => setCurrentPage('admin_create_module')}
                    className="flex items-center justify-center px-4 py-2 bg-blue-200 text-blue-900 font-semibold rounded-lg shadow-sm hover:bg-blue-300 transition-colors dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override">
                    <div className="h-5 w-5 mr-2">{ICONS.plus}</div>
                    <span>Novo Módulo</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stats cards now use totalModulesCount for the main number, others are estimates based on loaded data */}
                <StatCard title="Total (Servidor)" value={totalModulesCount} icon={ICONS.modules} iconBgColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
                <StatCard title="Ativos (Carregados)" value={publishedCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>} iconBgColor="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300" />
                <StatCard title="Públicos (Carregados)" value={publicCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.737 11l-.262-2.813a2 2 0 012.228-2.053h6.6c1.268 0 2.397.933 2.5 2.188l.244 2.687M12 11c-1.657 0-3 .895-3 2h6c0-1.105-1.343-2-3-2z" /></svg>} iconBgColor="bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300" />
                <StatCard title="Privados (Carregados)" value={privateCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} iconBgColor="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300" />
            </div>

            <Card className="overflow-x-auto !p-0">
                <div className="p-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center hc-text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Lista de Módulos ({modules.length} carregados)
                    </h2>
                    {selectedModules.size > 0 && (
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                {selectedModules.size} selecionado(s)
                            </span>
                            <button
                                onClick={onDeleteSelected}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-800 font-semibold rounded-lg hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                <span>Excluir Selecionados</span>
                            </button>
                        </div>
                    )}
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 hc-text-secondary">
                            <th className="p-4 w-4">
                                <input 
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    aria-label="Selecionar todos os módulos"
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="p-4">Título</th>
                            <th className="p-4">Série/Matéria</th>
                            <th className="p-4">Visibilidade</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Data</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modules.map(mod => <ModuleRow 
                            key={mod.id} 
                            module={mod} 
                            onEdit={() => onEdit(mod)} 
                            onDelete={() => onDelete(mod.id)} 
                            onStatusChange={() => onStatusChange(mod)}
                            isSelected={selectedModules.has(mod.id)}
                            onSelect={() => handleSelectModule(mod.id)}
                        />)}
                    </tbody>
                </table>
                {hasMoreModules && (
                    <div className="p-4 text-center border-t dark:border-slate-700">
                        <button 
                            onClick={fetchNextModulesPage}
                            disabled={isLoadingModules}
                            className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoadingModules ? (
                                <span className="flex items-center justify-center">
                                    <SpinnerIcon className="h-4 w-4 mr-2 text-current" />
                                    Carregando...
                                </span>
                            ) : (
                                "Carregar Mais"
                            )}
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdminManageModules;
