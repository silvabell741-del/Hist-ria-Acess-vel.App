
import React, { useState, useEffect, useContext } from 'react';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { AdminDataContext } from '../contexts/AdminDataContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { QuizQuestion, Quiz } from '../types';
import { useToast } from '../contexts/ToastContext';

const ADMIN_SUBJECTS = [
    'Artes', 'Biologia', 'Ciências', 'Educação Física', 'Espanhol', 'Filosofia', 'Física', 
    'Geografia', 'História', 'História Sergipana', 'Inglês', 'Matemática', 
    'Português / Literatura', 'Química', 'Sociologia', 'Tecnologia / Informática'
];

const SCHOOL_YEARS = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];

const MultiSelect: React.FC<{
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
    error?: boolean;
    helperText?: string;
    id?: string;
}> = ({ options, selected, onChange, label, error, helperText, id }) => {
    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const errorId = id ? `${id}-error` : undefined;
    const descriptionId = id ? `${id}-description` : undefined;
    const labelId = id ? `${id}-label` : undefined;

    return (
        <div className="space-y-2" role="group" aria-labelledby={labelId}>
            <label id={labelId} className={`block text-sm font-medium ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
                {label} <span className="text-red-500">*</span>
            </label>
            <div 
                className={`p-3 border rounded-md bg-white dark:bg-slate-700 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 ${error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                aria-describedby={error ? errorId : helperText ? descriptionId : undefined}
            >
                {options.map(option => (
                    <label key={option} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-600 rounded">
                        <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={() => toggleOption(option)}
                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 dark:bg-slate-600 dark:border-slate-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{option}</span>
                    </label>
                ))}
            </div>
            {(error || helperText) && (
                <p 
                    id={error ? errorId : descriptionId}
                    role={error ? "alert" : undefined}
                    className={`text-xs ${error ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    {error ? 'Selecione pelo menos uma opção.' : helperText}
                </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected.length === 0 ? 'Nenhum selecionado' : `${selected.length} selecionado(s)`}
            </p>
        </div>
    );
};

const AdminCreateQuiz: React.FC = () => {
    const { handleSaveQuiz, handleUpdateQuiz, isSubmitting } = useContext(AdminDataContext)!;
    const { setCurrentPage, editingQuiz, exitEditingQuiz } = useNavigation();
    const { addToast } = useToast();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    
    // Validation State
    const [formErrors, setFormErrors] = useState({
        title: false,
        series: false,
        subjects: false,
        questions: false
    });

    useEffect(() => {
        if (editingQuiz) {
            setTitle(editingQuiz.title);
            setDescription(editingQuiz.description);
            setQuestions(editingQuiz.questions);
            
             // Handle Series Multi-select backward compatibility
            if (Array.isArray(editingQuiz.series)) {
                setSelectedSeries(editingQuiz.series);
            } else if (editingQuiz.series) {
                setSelectedSeries([editingQuiz.series]);
            }

            // Handle Subjects Multi-select backward compatibility
            const subjects = editingQuiz.subjects || (editingQuiz.materia ? (Array.isArray(editingQuiz.materia) ? editingQuiz.materia : [editingQuiz.materia]) : []);
            setSelectedSubjects(subjects);
        } else {
             // Defaults empty to enforce selection
             setSelectedSeries([]);
             setSelectedSubjects([]);
        }
    }, [editingQuiz]);

    const handleAddQuestion = () => {
        setQuestions(prev => [
            ...prev,
            {
                id: Date.now(),
                question: '',
                choices: [{ id: '1', text: '' }, { id: '2', text: '' }],
                correctAnswerId: '1'
            }
        ]);
        // Clear questions error if adding one
        setFormErrors(prev => ({ ...prev, questions: false }));
    };

    const updateQuestion = (id: number, field: keyof QuizQuestion, value: any) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateChoice = (qId: number, cId: string, text: string) => {
        setQuestions(prev => prev.map(q => q.id === qId ? {
            ...q,
            choices: q.choices.map(c => c.id === cId ? { ...c, text } : c)
        } : q));
    };

    const addChoice = (qId: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId) {
                const newId = String(Date.now());
                return { ...q, choices: [...q.choices, { id: newId, text: '' }] };
            }
            return q;
        }));
    };

    const removeQuestion = (id: number) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const validateForm = () => {
        const errors = {
            title: !title.trim(),
            series: selectedSeries.length === 0,
            subjects: selectedSubjects.length === 0,
            questions: questions.length === 0
        };
        
        setFormErrors(errors);
        return !Object.values(errors).some(Boolean);
    };

    const handleSave = async () => {
        if (!validateForm()) {
            addToast('Por favor, corrija os erros marcados em vermelho.', 'error');
            return;
        }

        const quizData: any = {
            title,
            description,
            questions,
            visibility: 'public',
            status: 'Ativo',
            series: selectedSeries,
            materia: selectedSubjects,
            subjects: selectedSubjects
        };

        if (editingQuiz) {
            await handleUpdateQuiz({ ...quizData, id: editingQuiz.id, attempts: editingQuiz.attempts });
            exitEditingQuiz();
        } else {
            await handleSaveQuiz(quizData as Omit<Quiz, 'id'>);
            setCurrentPage('admin_quizzes');
        }
    };

    const handleCancel = () => {
        if (editingQuiz) exitEditingQuiz();
        else setCurrentPage('admin_quizzes');
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                 <div>
                     <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">
                        {editingQuiz ? 'Editar Quiz (Admin)' : 'Criar Quiz (Admin)'}
                    </h2>
                     <p className="text-slate-500 dark:text-slate-400 mt-1">Crie quizzes globais para prática dos alunos.</p>
                </div>
                <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hc-button-override">Voltar</button>
            </div>

            <Card>
                 <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6">Informações do Quiz</h3>
                 <div className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="quiz-title" className={`block text-sm font-medium ${formErrors.title ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
                            Título <span className="text-red-500">*</span>
                        </label>
                        <input 
                            id="quiz-title"
                            value={title} 
                            onChange={e => { setTitle(e.target.value); setFormErrors(prev => ({ ...prev, title: false })); }} 
                            className={`w-full p-2 border rounded-md dark:bg-slate-700 dark:text-white ${formErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                            placeholder="Ex: Revolução Francesa - Básico"
                            aria-invalid={formErrors.title}
                            aria-describedby={formErrors.title ? "quiz-title-error" : undefined}
                        />
                        {formErrors.title && <p id="quiz-title-error" role="alert" className="text-xs text-red-500">O título é obrigatório.</p>}
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="quiz-desc" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Descrição</label>
                        <textarea 
                            id="quiz-desc"
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            rows={3} 
                            className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                        />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MultiSelect 
                            id="quiz-series"
                            label="Séries (Filtro)" 
                            options={SCHOOL_YEARS} 
                            selected={selectedSeries} 
                            onChange={(val) => { setSelectedSeries(val); setFormErrors(prev => ({ ...prev, series: false })); }}
                            error={formErrors.series}
                            helperText="Essencial para que o aluno encontre este quiz."
                        />
                        <MultiSelect 
                            id="quiz-subjects"
                            label="Matérias (Filtro)" 
                            options={ADMIN_SUBJECTS} 
                            selected={selectedSubjects} 
                            onChange={(val) => { setSelectedSubjects(val); setFormErrors(prev => ({ ...prev, subjects: false })); }}
                            error={formErrors.subjects}
                            helperText="Define em qual categoria o quiz aparecerá."
                        />
                    </div>
                 </div>
            </Card>

             <div className="space-y-6">
                {questions.map((q, idx) => (
                    <Card key={q.id}>
                         <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">Questão {idx + 1}</h4>
                            <button onClick={() => removeQuestion(q.id)} className="text-sm text-red-600 hover:underline">Remover</button>
                        </div>
                        <div className="space-y-4">
                            <label htmlFor={`q-text-${q.id}`} className="sr-only">Enunciado</label>
                            <input 
                                id={`q-text-${q.id}`}
                                placeholder="Enunciado da pergunta..." 
                                value={q.question} 
                                onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                             <fieldset className="space-y-2">
                                <legend className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Alternativas (Marque a correta)</legend>
                                {q.choices.map(choice => (
                                    <div key={choice.id} className="flex items-center space-x-2">
                                        <input 
                                            type="radio" 
                                            name={`correct-${q.id}`} 
                                            checked={q.correctAnswerId === choice.id} 
                                            onChange={() => updateQuestion(q.id, 'correctAnswerId', choice.id)}
                                            className="h-4 w-4 text-indigo-600"
                                            aria-label={`Marcar alternativa ${choice.text || 'vazia'} como correta`}
                                        />
                                        <label htmlFor={`q-${q.id}-c-${choice.id}`} className="sr-only">Texto da alternativa</label>
                                        <input 
                                            id={`q-${q.id}-c-${choice.id}`}
                                            value={choice.text} 
                                            onChange={e => updateChoice(q.id, choice.id, e.target.value)} 
                                            className="flex-grow p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            placeholder="Texto da alternativa"
                                        />
                                    </div>
                                ))}
                                <button onClick={() => addChoice(q.id)} className="text-sm text-indigo-600 hover:underline mt-1">+ Adicionar Alternativa</button>
                             </fieldset>
                        </div>
                    </Card>
                ))}
                
                {formErrors.questions && (
                    <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm text-center dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                        Adicione pelo menos uma questão ao quiz.
                    </div>
                )}

                 <button onClick={handleAddQuestion} className="w-full p-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override">
                    Adicionar Questão
                </button>
            </div>

            <div className="flex justify-end space-x-4">
                <button onClick={handleCancel} className="px-6 py-2 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hc-button-override">Cancelar</button>
                <button onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 disabled:opacity-50 flex items-center space-x-2 dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40 hc-button-primary-override">
                     {isSubmitting ? <SpinnerIcon className="h-5 w-5" /> : ICONS.plus}
                    <span>{isSubmitting ? 'Salvando...' : 'Salvar Quiz'}</span>
                </button>
            </div>
        </div>
    );
};

export default AdminCreateQuiz;
