
import React, { useState, useMemo, useEffect } from 'react';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import type { TeacherClass, Activity, Unidade, ActivitySubmission } from '../types';

// Estrutura do relatório agrupado
type GroupedReport = {
    [key in Unidade]?: {
        activities: (Activity & { submission: ActivitySubmission })[];
        totalPoints: number;
    };
};

// Helper para ordenar unidades
const getUnitOrder = (unit: string): number => {
    const map: Record<string, number> = {
        '1ª Unidade': 1,
        '2ª Unidade': 2,
        '3ª Unidade': 3,
        '4ª Unidade': 4
    };
    return map[unit] || 99;
};

const SchoolRecords: React.FC = () => {
    const { teacherClasses, archivedClasses, fetchClassDetails } = useTeacherClassContext();

    // State for filters
    const [showArchived, setShowArchived] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedMateria, setSelectedMateria] = useState('all');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [expandedUnidade, setExpandedUnidade] = useState<string | null>(null);

    // Determine which list of classes to show based on the toggle
    const availableClasses = showArchived ? archivedClasses : teacherClasses;

    // Seleciona automaticamente a primeira turma se disponível, quando a lista muda
    useEffect(() => {
        if (availableClasses.length > 0) {
            // Se a turma selecionada não estiver na lista atual (ex: mudou de ativa para arquivada), reseta
            const currentExists = availableClasses.find(c => c.id === selectedClassId);
            if (!currentExists) {
                setSelectedClassId(availableClasses[0].id);
            }
        } else {
            setSelectedClassId('');
        }
    }, [availableClasses, selectedClassId]); // Removed availableClasses dependency to avoid loops, handled by length check logic mostly

    // Lazy Loading Trigger: Se a turma selecionada for apenas um resumo, busca os detalhes
    useEffect(() => {
        if (selectedClassId) {
            const cls = availableClasses.find(c => c.id === selectedClassId);
            if (cls && !cls.isFullyLoaded) {
                fetchClassDetails(selectedClassId);
            }
        }
    }, [selectedClassId, availableClasses, fetchClassDetails]);

    // Dados derivados da turma selecionada
    const selectedClass = useMemo(() => availableClasses.find(c => c.id === selectedClassId), [availableClasses, selectedClassId]);
    
    // Verifica se está carregando os detalhes (existe o objeto mas não está completo)
    const isClassLoading = selectedClass && !selectedClass.isFullyLoaded;

    // Lista de alunos, ordenada alfabeticamente
    const studentsInClass = useMemo(() => {
        if (!selectedClass?.students) return [];
        // Filtra alunos inativos para o histórico escolar (opcional, mas recomendado para limpeza visual)
        // Se quiser ver histórico de alunos que saíram, remova o filtro .filter
        return [...selectedClass.students]
            .filter(s => s.status !== 'inactive') 
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedClass]);

    const selectedStudent = useMemo(() => studentsInClass.find(s => s.id === selectedStudentId), [studentsInClass, selectedStudentId]);
    
    // Lista dinâmica de matérias baseada nas atividades da turma
    const materiaOptions = useMemo(() => {
        if (!selectedClass || !selectedClass.activities) return [];
        const materias = new Set(selectedClass.activities.map(a => a.materia).filter(Boolean) as string[]);
        return Array.from(materias).sort();
    }, [selectedClass]);

    // Resetar filtros secundários ao trocar de turma
    useEffect(() => {
        setSelectedStudentId(null);
        setSelectedMateria('all');
        setExpandedUnidade(null);
    }, [selectedClassId]);

    // GERAÇÃO DO RELATÓRIO (Lógica Principal)
    const reportData = useMemo((): GroupedReport | null => {
        if (!selectedStudent || !selectedClass) return null;

        const grouped: GroupedReport = {};
        const activities = selectedClass.activities || [];
        
        for (const activity of activities) {
            // Filtro de Matéria
            if (selectedMateria !== 'all' && activity.materia !== selectedMateria) {
                continue;
            }

            // Busca a submissão do aluno nesta atividade
            const submission = activity.submissions?.find(s => 
                s.studentId === selectedStudent.id && s.status === 'Corrigido'
            );

            // Se houver submissão corrigida e unidade definida
            if (submission && activity.unidade && typeof submission.grade === 'number') {
                const unidadeKey = activity.unidade as Unidade;
                
                if (!grouped[unidadeKey]) {
                    grouped[unidadeKey] = { activities: [], totalPoints: 0 };
                }
                
                grouped[unidadeKey]!.activities.push({ ...activity, submission });
                grouped[unidadeKey]!.totalPoints += submission.grade;
            }
        }

        // Ordenação das atividades dentro de cada unidade (Data da correção mais recente primeiro)
        Object.keys(grouped).forEach((key) => {
            const uKey = key as Unidade;
            grouped[uKey]!.activities.sort((a, b) => {
                const dateA = a.submission.gradedAt ? new Date(a.submission.gradedAt).getTime() : 0;
                const dateB = b.submission.gradedAt ? new Date(b.submission.gradedAt).getTime() : 0;
                return dateB - dateA;
            });
        });

        return grouped;
    }, [selectedStudent, selectedClass, selectedMateria]);

    // Ordenação das chaves das unidades para exibição
    const sortedUnits = useMemo(() => {
        if (!reportData) return [];
        return (Object.keys(reportData) as Unidade[]).sort((a, b) => getUnitOrder(a) - getUnitOrder(b));
    }, [reportData]);

    const toggleUnidade = (unidade: string) => {
        setExpandedUnidade(prev => (prev === unidade ? null : unidade));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border ${
                        showArchived 
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' 
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600'
                    }`}
                >
                    {showArchived ? 'Voltar para Turmas Ativas' : 'Ver Turmas Concluídas'}
                </button>
            </div>

            {showArchived && (
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 dark:bg-indigo-900/20 dark:border-indigo-500">
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                        Visualizando turmas arquivadas. Essas turmas não aparecem no seu painel principal.
                    </p>
                </div>
            )}

            <Card className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b-4 border-indigo-500">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label htmlFor="class-filter" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            {showArchived ? 'Turma Arquivada' : 'Turma Ativa'}
                        </label>
                        <select
                            id="class-filter"
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        >
                            {availableClasses.length === 0 ? (
                                <option disabled value="">Nenhuma turma {showArchived ? 'arquivada' : 'disponível'}</option>
                            ) : (
                                availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            )}
                        </select>
                    </div>
                     <div className="flex-1">
                        <label htmlFor="materia-filter" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Matéria</label>
                        <select
                            id="materia-filter"
                            value={selectedMateria}
                            onChange={e => setSelectedMateria(e.target.value)}
                            disabled={!selectedClassId || materiaOptions.length === 0}
                            className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        >
                            <option value="all">Todas as matérias</option>
                            {materiaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            {isClassLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="flex flex-col items-center space-y-4">
                        <SpinnerIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-slate-500 dark:text-slate-400">Carregando dados da turma...</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Lista de Alunos */}
                    <Card className="lg:col-span-4 !p-0 overflow-hidden h-fit">
                        <div className="p-4 bg-slate-100 dark:bg-slate-700/50 border-b dark:border-slate-700">
                            <h2 className="font-bold text-slate-700 dark:text-slate-200 flex items-center">
                                {ICONS.students}
                                <span className="ml-2">Alunos ({studentsInClass.length})</span>
                            </h2>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-2">
                            {studentsInClass.length > 0 ? (
                                studentsInClass.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all flex items-center space-x-3 ${
                                            selectedStudentId === student.id 
                                                ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]' 
                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedStudentId === student.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'}`}>
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium truncate">{student.name}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    <p>Nenhum aluno encontrado nesta turma.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Área do Relatório */}
                    <div className="lg:col-span-8">
                        {selectedStudent ? (
                            <Card className="!p-0 overflow-hidden min-h-[400px]">
                                 <div className="p-6 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                        {selectedStudent.name}
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                        Relatório de Desempenho - {selectedClass?.name}
                                    </p>
                                </div>

                                {reportData && sortedUnits.length > 0 ? (
                                    <div className="p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                                        {sortedUnits.map(unidade => {
                                            const data = reportData[unidade];
                                            const isExpanded = expandedUnidade === unidade;
                                            
                                            return (
                                                <div key={unidade} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200">
                                                    <div 
                                                        className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30" 
                                                        onClick={() => toggleUnidade(unidade)}
                                                    >
                                                        <div className="flex items-center space-x-4">
                                                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                                                {getUnitOrder(unidade)}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-slate-800 dark:text-slate-200">{unidade}</h3>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400">{data?.activities.length} atividades avaliadas</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{data?.totalPoints} <span className="text-sm font-normal text-slate-400">pts</span></p>
                                                        </div>
                                                    </div>
                                                    
                                                    {isExpanded && (
                                                        <div className="border-t border-slate-100 dark:border-slate-700">
                                                            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between">
                                                                <span>Atividade</span>
                                                                <span>Nota</span>
                                                            </div>
                                                            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                                                {data?.activities.map(act => (
                                                                    <li key={act.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 flex justify-between items-center">
                                                                        <div>
                                                                            <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{act.title}</p>
                                                                            <div className="flex items-center space-x-2 mt-1">
                                                                                {act.materia && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-bold">{act.materia}</span>}
                                                                                <span className="text-xs text-slate-400">
                                                                                    {act.submission.gradedAt ? new Date(act.submission.gradedAt).toLocaleDateString() : '-'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="font-bold text-slate-800 dark:text-slate-100 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-lg text-sm">
                                                                                {act.submission.grade}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 mt-1">de {act.points}</span>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <p className="font-medium">Nenhuma atividade corrigida encontrada.</p>
                                        <p className="text-sm mt-1">Verifique se há correções pendentes para este aluno.</p>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-full p-6 mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">Selecione um Aluno</h3>
                                <p className="text-sm text-center max-w-xs mt-2">Clique em um nome na lista à esquerda para visualizar o boletim detalhado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolRecords;
