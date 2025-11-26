
import React, { useState, useMemo } from 'react';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './common/Card';
import type { Unidade, ClassGradeReport } from '../types';
import { SpinnerIcon } from '../constants/index';

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

// Helper para cores das notas
const getScoreColor = (score: number | undefined | null): string => {
    if (score === undefined || score === null) return 'text-slate-500 border-slate-200 bg-slate-50';
    
    const val = Number(score.toFixed(1));
    
    if (val >= 10) return 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'; // Dourado
    if (val >= 7.1) return 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'; // Verde Esmeralda
    if (val >= 5.0) return 'text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'; // Azul Royal
    return 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20'; // Vermelho Carmesim Intenso
};

const ClassReportCard: React.FC<{ classId: string; classReport: ClassGradeReport; }> = ({ classId, classReport }) => {
    const [expandedUnidade, setExpandedUnidade] = useState<string | null>(null);

    // DEFENSIVE CODING: Handle undefined props
    if (!classReport) return null;

    const safeUnidades = classReport.unidades || {};

    const sortedUnidades = useMemo(() => {
        return Object.keys(safeUnidades).sort((a, b) => getUnitOrder(a) - getUnitOrder(b));
    }, [safeUnidades]);

    const hasAnyPoints = sortedUnidades.length > 0;

    if (!hasAnyPoints) {
        return (
            <Card>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{classReport.className || 'Turma'}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Nenhuma nota registrada para esta turma ainda.</p>
            </Card>
        );
    }

    const toggleUnidade = (unidade: string) => {
        setExpandedUnidade(prev => prev === unidade ? null : unidade);
    };

    return (
        <Card className="!p-0 overflow-hidden">
            <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{classReport.className || 'Turma'}</h3>
            </div>
            <div className="divide-y dark:divide-slate-700">
                {sortedUnidades.map(unidadeName => {
                    const unitData = safeUnidades[unidadeName as Unidade];
                    if (!unitData || !unitData.subjects) return null;

                    const isExpanded = expandedUnidade === unidadeName;
                    const subjects = Object.keys(unitData.subjects).sort();

                    return (
                        <div key={unidadeName}>
                            <div 
                                className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" 
                                onClick={() => toggleUnidade(unidadeName)} 
                                role="button" 
                                aria-expanded={isExpanded}
                            >
                                <div>
                                    <p className="font-semibold text-slate-700 dark:text-slate-200">{unidadeName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{subjects.length} matéria(s) avaliada(s)</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ver Detalhes</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="bg-slate-50/50 dark:bg-slate-900/20 border-t dark:border-slate-700">
                                    {subjects.map((subjectName, idx) => {
                                        const subjectData = unitData.subjects[subjectName];
                                        if (!subjectData) return null;
                                        
                                        const sortedActivities = [...(subjectData.activities || [])].sort((a, b) => a.title.localeCompare(b.title));
                                        const colorClass = getScoreColor(subjectData.totalPoints);
                                        
                                        return (
                                            <div key={subjectName} className={`p-4 ${idx > 0 ? 'border-t border-dashed border-slate-200 dark:border-slate-700' : ''}`}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-sm tracking-wide">{subjectName}</h4>
                                                    <span className={`font-bold px-3 py-1 rounded border text-sm shadow-sm ${colorClass}`}>
                                                        Total: {Number(subjectData.totalPoints || 0).toFixed(1).replace(/\.0$/, '')} pts
                                                    </span>
                                                </div>
                                                
                                                <ul className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                                    {sortedActivities.map(act => (
                                                        <li key={act.id} className="flex justify-between items-center text-sm p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded transition-colors">
                                                            <span className="text-slate-700 dark:text-slate-300">{act.title}</span>
                                                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                                                                {act.grade} <span className="text-[10px] text-slate-400">/ {act.maxPoints}</span>
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

const Boletim: React.FC = () => {
    const { user } = useAuth();
    const { gradeReport, isLoading } = useStudentAcademic();

    if (isLoading) {
        return (
             <div className="flex justify-center items-center h-full pt-16">
                <SpinnerIcon className="h-12 w-12 text-indigo-500" />
            </div>
        )
    }

    if (!user) return null;

    // Defensive: Ensure gradeReport is an object
    const safeReport = gradeReport || {};
    const hasData = Object.keys(safeReport).length > 0;

    if (!hasData) {
         return (
            <Card className="text-center py-20">
                <div className="inline-block bg-slate-100 dark:bg-slate-700/50 rounded-full p-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">Boletim Indisponível</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Você ainda não está matriculado em nenhuma turma ou não possui notas lançadas.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
             <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Meu Boletim</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhe seu desempenho escolar por unidade e matéria.</p>
            </div>

            <ul className="space-y-6">
                {Object.entries(safeReport).map(([classId, classReport]) => (
                    <li key={classId}>
                        <ClassReportCard classId={classId} classReport={classReport} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Boletim;
