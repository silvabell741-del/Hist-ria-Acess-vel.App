// FILE: components/TeacherGradingView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { Activity, ActivitySubmission, ActivityItem } from '../types';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useToast } from '../contexts/ToastContext';
import { generateFeedbackAndGrade } from '../utils/gradingAI';

const TeacherGradingView: React.FC = () => {
    const { gradingActivity, exitGrading } = useNavigation();
    const { handleGradeActivity } = useTeacherAcademicContext();
    const { addToast } = useToast();

    // Local State
    const [activity, setActivity] = useState<Activity | null>(gradingActivity);
    const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'graded'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Grade Form State
    const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
    const [currentGrade, setCurrentGrade] = useState<string>('');
    const [currentFeedback, setCurrentFeedback] = useState<string>('');
    
    // Controle de override manual para questões objetivas
    const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());

    // AI Loading State
    const [gradingItemIds, setGradingItemIds] = useState<Set<string>>(new Set());
    const [isGradingAll, setIsGradingAll] = useState(false);

    // Fetch Full Data on Mount
    useEffect(() => {
        if (!gradingActivity?.id) return;

        const fetchFullData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Activity Doc (ensure latest points/items)
                const activityRef = doc(db, "activities", gradingActivity.id);
                const activitySnap = await getDoc(activityRef);
                
                if (!activitySnap.exists()) {
                    addToast("Atividade não encontrada.", "error");
                    exitGrading();
                    return;
                }
                
                const activityData = { id: activitySnap.id, ...activitySnap.data() } as Activity;
                setActivity(activityData);

                // 2. Fetch Submissions Subcollection
                const subRef = collection(db, "activities", gradingActivity.id, "submissions");
                const q = query(subRef, orderBy("submissionDate", "asc"));
                const subSnap = await getDocs(q);

                const subs = subSnap.docs.map(d => {
                    const data = d.data();
                    return {
                        studentId: d.id,
                        ...data,
                        submissionDate: data.submissionDate?.toDate ? data.submissionDate.toDate().toISOString() : data.submissionDate,
                        gradedAt: data.gradedAt?.toDate ? data.gradedAt.toDate().toISOString() : data.gradedAt
                    } as ActivitySubmission;
                });

                setSubmissions(subs);

            } catch (error) {
                console.error("Error loading grading data:", error);
                addToast("Erro ao carregar dados da atividade.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullData();
    }, [gradingActivity?.id, addToast, exitGrading]);

    // Derived Data
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(s => {
            const matchesStatus = filterStatus === 'all' 
                ? true 
                : filterStatus === 'pending' 
                    ? s.status === 'Aguardando correção'
                    : s.status === 'Corrigido';
            
            const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesStatus && matchesSearch;
        });
    }, [submissions, filterStatus, searchTerm]);

    const selectedSubmission = useMemo(() => 
        submissions.find(s => s.studentId === selectedStudentId), 
    [submissions, selectedStudentId]);

    const currentIndex = useMemo(() => 
        filteredSubmissions.findIndex(s => s.studentId === selectedStudentId),
    [filteredSubmissions, selectedStudentId]);

    const isLast = currentIndex === -1 || currentIndex === filteredSubmissions.length - 1;

    const items = useMemo((): ActivityItem[] => {
        if (!activity) return [];
        
        if (activity.items && activity.items.length > 0) {
            return activity.items;
        }
        
        if (activity.questions && activity.questions.length > 0) {
            // Legacy mapping strict type
            return activity.questions.map((q: any) => ({
                id: q.id.toString(),
                type: 'multiple_choice',
                question: q.question,
                options: q.choices,
                correctOptionId: q.correctAnswerId,
                points: 1
            } as ActivityItem));
        }
        return [];
    }, [activity]);

    // Parse Answers
    const studentAnswers = useMemo(() => {
        if (!selectedSubmission?.content) return {};
        try {
            return JSON.parse(selectedSubmission.content);
        } catch {
            return {}; 
        }
    }, [selectedSubmission]);

    const isLegacySubmission = selectedSubmission && !selectedSubmission.content.startsWith('{');

    // Sync form with selected student & Auto-Grade MC
    useEffect(() => {
        if (selectedSubmission && activity) {
            setManualOverrides(new Set()); // Reset overrides on student change

            // Initialize Scores
            const initialScores: Record<string, number> = {};
            const savedScores = selectedSubmission.scores || {};
            
            items.forEach(item => {
                // Se já tem nota salva, usa. Se não, calcula.
                if (savedScores[item.id] !== undefined) {
                    initialScores[item.id] = savedScores[item.id];
                } else {
                    // CORREÇÃO AUTOMÁTICA PARA MÚLTIPLA ESCOLHA
                    if (item.type === 'multiple_choice' && item.correctOptionId) {
                        const answer = studentAnswers[item.id];
                        // Se acertou, nota cheia. Se errou, 0.
                        if (answer === item.correctOptionId) {
                            initialScores[item.id] = item.points;
                        } else {
                            initialScores[item.id] = 0;
                        }
                    } else {
                        // Text items default to 0 if not graded
                        initialScores[item.id] = 0;
                    }
                }
            });
            
            setQuestionScores(initialScores);
            setCurrentFeedback(selectedSubmission.feedback || '');
            
            // Calculate initial total
            const total = (Object.values(initialScores) as number[]).reduce((acc, curr) => acc + (curr || 0), 0);
            setCurrentGrade(total.toString());
        }
    }, [selectedSubmission, activity, items, studentAnswers]);

    // Auto-Summation Effect (Real-time)
    useEffect(() => {
        if (selectedSubmission) {
            const total = (Object.values(questionScores) as number[]).reduce((acc, curr) => acc + (curr || 0), 0);
            // Format to remove unnecessary decimals, max 1 decimal place
            setCurrentGrade(Math.round(total * 10) / 10 + "");
        }
    }, [questionScores, selectedSubmission]);

    const handleScoreChange = (itemId: string, val: string) => {
        const num = parseFloat(val);
        setQuestionScores(prev => ({
            ...prev,
            [itemId]: isNaN(num) ? 0 : num
        }));
    };

    const toggleManualOverride = (itemId: string) => {
        setManualOverrides(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
                // Revert to auto-grade logic immediately when turning off override
                const item = items.find(i => i.id === itemId);
                if (item && item.type === 'multiple_choice' && item.correctOptionId) {
                    const answer = studentAnswers[item.id];
                    const autoScore = (answer === item.correctOptionId) ? item.points : 0;
                    setQuestionScores(s => ({ ...s, [itemId]: autoScore }));
                }
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // AI Handlers
    const handleGradeWithAI = async (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        const answer = studentAnswers[itemId];
        
        if (!item || !answer) return;

        setGradingItemIds(prev => new Set(prev).add(itemId));
        try {
            const result = await generateFeedbackAndGrade(item.question, answer, item.points);
            
            // Update Score
            setQuestionScores(prev => ({ ...prev, [itemId]: result.grade }));
            
            // Append Feedback
            const feedbackToAdd = `\n[IA - Questão ${items.indexOf(item) + 1}]: ${result.feedback}`;
            setCurrentFeedback(prev => prev ? prev + feedbackToAdd : feedbackToAdd.trim());
            
            addToast("Questão corrigida pela IA!", "success");
        } catch (error) {
            addToast("Erro ao corrigir com IA.", "error");
        } finally {
            setGradingItemIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
        }
    };

    const handleGradeAllWithAI = async () => {
        setIsGradingAll(true);
        try {
            const textItems = items.filter(i => i.type === 'text');
            let accumulatedFeedback = currentFeedback;
            const newScores = { ...questionScores };

            for (const item of textItems) {
                const answer = studentAnswers[item.id];
                if (answer) {
                    setGradingItemIds(prev => new Set(prev).add(item.id));
                    try {
                        const result = await generateFeedbackAndGrade(item.question, answer, item.points);
                        newScores[item.id] = result.grade;
                        accumulatedFeedback += `\n\n[IA - Questão ${items.indexOf(item) + 1}]: ${result.feedback}`;
                    } catch (e) {
                        console.error(e);
                    }
                    setGradingItemIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(item.id);
                        return newSet;
                    });
                }
            }

            setQuestionScores(newScores);
            setCurrentFeedback(accumulatedFeedback.trim());
            addToast("Correção automática concluída!", "success");

        } catch (error) {
            addToast("Erro ao executar correção em massa.", "error");
        } finally {
            setIsGradingAll(false);
        }
    };

    // Save Handler
    const handleSave = async (action: 'stay' | 'next' | 'exit') => {
        if (!activity || !selectedSubmission) return;
        
        const gradeNum = parseFloat(currentGrade.replace(',', '.'));
        if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > activity.points) {
            addToast(`Nota final inválida. Máximo: ${activity.points}`, "error");
            return;
        }

        setIsSaving(true);
        try {
            const success = await handleGradeActivity(
                activity.id, 
                selectedSubmission.studentId, 
                gradeNum, 
                currentFeedback,
                questionScores
            );

            if (success) {
                setSubmissions(prev => prev.map(s => 
                    s.studentId === selectedSubmission.studentId 
                        ? { 
                            ...s, 
                            status: 'Corrigido', 
                            grade: gradeNum, 
                            feedback: currentFeedback, 
                            gradedAt: new Date().toISOString(),
                            scores: questionScores
                          }
                        : s
                ));
                
                addToast("Correção salva!", "success");

                if (action === 'next') {
                    if (currentIndex < filteredSubmissions.length - 1) {
                        setSelectedStudentId(filteredSubmissions[currentIndex + 1].studentId);
                    } else {
                        // Safety fallback in case isLast calculation was stale, though unlikely
                        exitGrading();
                    }
                } else if (action === 'exit') {
                    exitGrading();
                }
            }
        } catch (error) {
            // Error in context
        } finally {
            setIsSaving(false);
        }
    };

    if (!activity) return <div className="p-8 text-center">Carregando...</div>;

    const hasTextQuestions = items.some(i => i.type === 'text');

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
            {/* Left Sidebar: Student List */}
            <div className={`w-full md:w-80 flex-col bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden ${selectedStudentId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-slate-700 dark:text-slate-200">Alunos</h2>
                        <button onClick={exitGrading} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">Sair</button>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar aluno..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white mb-2"
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setFilterStatus('all')} className={`flex-1 text-xs py-1 rounded ${filterStatus === 'all' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>Todos</button>
                        <button onClick={() => setFilterStatus('pending')} className={`flex-1 text-xs py-1 rounded ${filterStatus === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>Pendentes</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredSubmissions.map(sub => (
                        <button
                            key={sub.studentId}
                            onClick={() => setSelectedStudentId(sub.studentId)}
                            className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition-colors ${
                                selectedStudentId === sub.studentId 
                                    ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 border' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                            }`}
                        >
                            <div className="overflow-hidden">
                                <p className={`font-medium truncate ${selectedStudentId === sub.studentId ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{sub.studentName}</p>
                                <p className="text-xs text-slate-500 truncate">{new Date(sub.submissionDate).toLocaleDateString()}</p>
                            </div>
                            {sub.status === 'Corrigido' ? (
                                <div className="h-5 w-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">✓</div>
                            ) : (
                                <div className="h-5 w-5 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">!</div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900/30 rounded-xl border dark:border-slate-700 relative ${selectedStudentId ? 'flex' : 'hidden md:flex'}`}>
                {selectedSubmission ? (
                    <>
                        {/* Mobile Header */}
                        <div className="md:hidden p-2 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                            <button onClick={() => setSelectedStudentId(null)} className="flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                Voltar para Lista
                            </button>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-32">
                            
                            {/* Simple Student Header (Scrollable) */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedSubmission.studentName}</h1>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {new Date(selectedSubmission.submissionDate).toLocaleString()}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedSubmission.status === 'Corrigido' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                    {selectedSubmission.status}
                                </span>
                            </div>

                            {isLegacySubmission ? (
                                <Card>
                                    <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Resposta do Aluno (Texto)</h3>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-700 font-mono whitespace-pre-wrap text-sm">
                                        {selectedSubmission.content}
                                    </div>
                                </Card>
                            ) : (
                                <div className="space-y-6">
                                    {items.map((item, idx) => {
                                        const answer = studentAnswers[item.id];
                                        const isMC = item.type === 'multiple_choice';
                                        const score = questionScores[item.id] || 0;
                                        
                                        let isCorrect = null;
                                        if (isMC && item.correctOptionId) isCorrect = answer === item.correctOptionId;
                                        
                                        // ReadOnly Logic: MC is readonly by default unless manually overridden. Text is editable.
                                        const canEditScore = !isMC || manualOverrides.has(item.id);
                                        const isGradingThis = gradingItemIds.has(item.id);

                                        return (
                                            <Card key={item.id} className={`border-l-4 ${isMC ? (isCorrect ? 'border-l-green-500' : 'border-l-red-500') : 'border-l-blue-500'}`}>
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                                    <div>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">Questão {idx + 1}</span>
                                                        <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 ml-2">Max: {item.points} pts</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {/* Botão IA apenas para texto */}
                                                        {!isMC && (
                                                            <button
                                                                onClick={() => handleGradeWithAI(item.id)}
                                                                disabled={isGradingThis || !answer}
                                                                className="mr-2 flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-200 disabled:opacity-50 dark:bg-indigo-900/50 dark:text-indigo-300"
                                                                title="Avaliar resposta com IA"
                                                            >
                                                                {isGradingThis ? <SpinnerIcon className="h-3 w-3" /> : ICONS.ai_generate}
                                                                <span className="ml-1">{isGradingThis ? 'Avaliando...' : 'IA'}</span>
                                                            </button>
                                                        )}

                                                        <label className="text-xs font-bold text-slate-500">Nota:</label>
                                                        <input 
                                                            type="number" 
                                                            value={score}
                                                            onChange={e => handleScoreChange(item.id, e.target.value)}
                                                            min={0}
                                                            max={item.points}
                                                            step="0.1"
                                                            readOnly={!canEditScore}
                                                            className={`w-20 p-1 text-sm border rounded text-center font-bold ${!canEditScore ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-700 dark:text-white border-slate-300 dark:border-slate-600'}`}
                                                        />
                                                        
                                                        {/* Botão para forçar edição manual em MC */}
                                                        {isMC && (
                                                            <button 
                                                                onClick={() => toggleManualOverride(item.id)}
                                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline"
                                                                title={canEditScore ? "Voltar para cálculo automático" : "Editar nota manualmente"}
                                                            >
                                                                {canEditScore ? 'Auto' : 'Editar'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <p className="mb-4 text-slate-800 dark:text-slate-100">{item.question}</p>
                                                
                                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border dark:border-slate-700">
                                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Resposta do Aluno:</p>
                                                    {isMC ? (
                                                        <div className="flex items-center gap-2">
                                                            {isCorrect ? (
                                                                <span className="text-green-600 font-bold flex items-center"><span className="mr-1">✓</span> {item.options?.find(o => o.id === answer)?.text || '(Sem resposta)'}</span>
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    <span className="text-red-600 font-bold flex items-center line-through decoration-2"><span className="mr-1">✗</span> {item.options?.find(o => o.id === answer)?.text || '(Sem resposta)'}</span>
                                                                    <span className="text-green-600 text-sm mt-1">Correto: {item.options?.find(o => o.id === item.correctOptionId)?.text}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{answer || '(Sem resposta)'}</p>
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                            
                            <Card className="mt-8 border-t-4 border-indigo-500">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Feedback Geral</label>
                                <textarea 
                                    rows={3}
                                    value={currentFeedback}
                                    onChange={e => setCurrentFeedback(e.target.value)}
                                    placeholder="Escreva um comentário para o aluno..."
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                />
                            </Card>
                        </div>

                        {/* Sticky Footer Actions */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] gap-4">
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Nota Final</span>
                                    <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {currentGrade} <span className="text-sm text-slate-400 font-normal">/ {activity.points}</span>
                                    </span>
                                </div>
                                {hasTextQuestions && !isLegacySubmission && (
                                    <button
                                        onClick={handleGradeAllWithAI}
                                        disabled={isGradingAll}
                                        className="flex items-center px-3 py-2 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-200 disabled:opacity-50 dark:bg-purple-900/30 dark:text-purple-300 ml-4"
                                    >
                                        {isGradingAll ? <SpinnerIcon className="h-4 w-4 mr-1" /> : <div className="h-4 w-4 mr-1">{ICONS.ai_generate}</div>}
                                        Corrigir Texto (IA)
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button 
                                    onClick={() => handleSave('stay')}
                                    disabled={isSaving}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                                >
                                    Salvar
                                </button>
                                <button 
                                    onClick={() => handleSave(isLast ? 'exit' : 'next')}
                                    disabled={isSaving}
                                    className={`flex-1 sm:flex-none px-6 py-2 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 flex items-center justify-center transition-colors ${isLast ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {isSaving ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                                    {isLast ? 'Salvar e Sair' : 'Salvar e Próximo'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <p>Selecione um aluno à esquerda para começar a corrigir.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherGradingView;