
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from './common/Card';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useStudentGamificationContext } from '../contexts/StudentGamificationContext';
import type { Quiz } from '../types';
import { QuizView } from './QuizView';
import { useAuth } from '../contexts/AuthContext';
import { SpinnerIcon } from '../constants/index';

const QuizCard: React.FC<{ quiz: Quiz, onStart: () => void }> = ({ quiz, onStart }) => {
    const attempts = quiz.attempts || 0;
    const statusText = attempts > 0 ? `Feito ${attempts}x` : 'Não iniciado';
    const statusColor = attempts > 0 ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    
    const displayMateria = Array.isArray(quiz.materia) ? quiz.materia.join(', ') : quiz.materia;
    const displaySeries = Array.isArray(quiz.series) ? quiz.series.join(', ') : quiz.series;

    return (
        <Card className="flex flex-col h-full">
            <div className="flex-grow">
                 <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 hc-text-primary pr-2">{quiz.title}</h3>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                        {statusText}
                    </span>
                </div>
                 <div className="flex items-center flex-wrap gap-2 mt-3 text-xs font-medium">
                    {displaySeries && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 truncate max-w-[150px]">{displaySeries}</span>}
                    {displayMateria && <span className="px-2 py-1 rounded bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200 truncate max-w-[150px]">{displayMateria}</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex-grow hc-text-secondary line-clamp-3">{quiz.description}</p>
            </div>
            <button
                onClick={onStart}
                className="mt-6 w-full font-semibold py-2.5 px-4 rounded-lg transition-colors bg-indigo-200 text-indigo-900 hover:bg-indigo-300 dark:bg-indigo-500/30 dark:text-indigo-200 dark:hover:bg-indigo-500/40 hc-button-primary-override"
            >
                {attempts > 0 ? 'Tentar Novamente' : 'Iniciar Quiz'}
            </button>
        </Card>
    );
};

const Quizzes: React.FC = () => {
    const { user } = useAuth();
    const { searchedQuizzes, searchQuizzes, isSearchingQuizzes } = useStudentAcademic();
    const { handleQuizCompleteLogic } = useStudentGamificationContext();
    
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

    const [selectedSerie, setSelectedSerie] = useState(user?.series || 'all');
    const [selectedMateria, setSelectedMateria] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'feito' | 'nao_iniciado'>('all');

    const seriesOptions = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)"];
    const materiaOptions = ["História", "Geografia", "Filosofia", "Sociologia", "História Sergipana", "Artes", "Ciências"];
    const filterSelectClasses = "w-full md:w-auto p-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200";

    const currentQuizData = selectedQuizId ? searchedQuizzes.find(q => q.id === selectedQuizId) : null;

    const handleSearch = () => {
        searchQuizzes({
            serie: selectedSerie,
            materia: selectedMateria,
            status: selectedStatus
        });
    };

    if (currentQuizData) {
        return (
            <div className="max-w-4xl mx-auto">
                <button onClick={() => setSelectedQuizId(null)} className="mb-4 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400 hc-link-override">
                    &larr; Voltar para a lista de Quizzes
                </button>
                <Card>
                    <QuizView quiz={currentQuizData} onQuizComplete={handleQuizCompleteLogic} />
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <p className="text-slate-500 dark:text-slate-400 hc-text-secondary">Encontre quizzes para testar seus conhecimentos.</p>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-4 hc-bg-override hc-border-override border border-slate-200 dark:border-slate-700">
                <div className="flex-grow">
                    <label htmlFor="serie-filter" className="sr-only">Filtrar por série</label>
                    <select id="serie-filter" value={selectedSerie} onChange={e => setSelectedSerie(e.target.value)} className={filterSelectClasses}>
                        <option value="all">Todas as séries</option>
                        {seriesOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex-grow">
                   <label htmlFor="materia-filter" className="sr-only">Filtrar por matéria</label>
                    <select id="materia-filter" value={selectedMateria} onChange={e => setSelectedMateria(e.target.value)} className={filterSelectClasses}>
                        <option value="all">Todas as matérias</option>
                        {materiaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="flex-grow">
                    <label htmlFor="status-filter" className="sr-only">Filtrar por status</label>
                    <select id="status-filter" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)} className={filterSelectClasses}>
                        <option value="all">Todos os status</option>
                        <option value="nao_iniciado">Não iniciados</option>
                        <option value="feito">Feitos</option>
                    </select>
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isSearchingQuizzes}
                    className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center hc-button-primary-override"
                >
                    {isSearchingQuizzes ? <SpinnerIcon className="h-5 w-5" /> : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            Buscar
                        </>
                    )}
                </button>
            </div>

            {searchedQuizzes.length > 0 ? (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {searchedQuizzes.map(quiz => (
                        <li key={quiz.id}>
                            <QuizCard quiz={quiz} onStart={() => setSelectedQuizId(quiz.id)} />
                        </li>
                    ))}
                </ul>
            ) : !isSearchingQuizzes && (
                <Card className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 border-dashed border-2 border-slate-300 dark:border-slate-700">
                     <div className="flex justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Procurando um desafio?</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 hc-text-secondary max-w-md mx-auto">
                        Para praticar, selecione uma matéria nos filtros acima e clique em <strong>Buscar</strong>.
                    </p>
                </Card>
            )}
        </div>
    );
};

export default Quizzes;
