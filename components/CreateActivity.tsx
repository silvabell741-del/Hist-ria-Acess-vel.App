
import React, { useState, useEffect, useMemo } from 'react';
import type { Activity, ActivityItem, ActivityItemType, Unidade } from '../types';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import { storage } from './firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';

// --- Local Components Defined Outside ---
const InputField: React.FC<{ label: string, required?: boolean, children?: React.ReactNode }> = ({ label, required, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

const CreateActivity: React.FC = () => {
    // Hooks
    const { teacherClasses } = useTeacherClassContext();
    const { handleSaveActivity, handleUpdateActivity, isSubmittingContent } = useTeacherAcademicContext();
    const { setCurrentPage, editingActivity, exitEditingActivity } = useNavigation();
    const { addToast } = useToast();
    const { user } = useAuth();
    
    // State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [selectedClassId, setSelectedClassId] = useState(teacherClasses.length > 0 ? teacherClasses[0].id : '');
    const [unidade, setUnidade] = useState<Unidade>('1ª Unidade');
    const [materia, setMateria] = useState('História');
    const [dueDate, setDueDate] = useState('');
    const [isVisible, setIsVisible] = useState(true);
    const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [items, setItems] = useState<ActivityItem[]>([]);
    const [gradingMode, setGradingMode] = useState<'automatic' | 'manual'>('automatic');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditMode = !!editingActivity;
    const materiaOptions = [ 'Artes', 'Biologia', 'Ciências', 'Educação Física', 'Espanhol', 'Filosofia', 'Física', 'Geografia', 'História', 'História Sergipana', 'Inglês', 'Matemática', 'Português / Literatura', 'Química', 'Sociologia', 'Tecnologia / Informática'];

    const totalPoints = useMemo(() => items.reduce((acc, item) => acc + (item.points || 0), 0), [items]);

    useEffect(() => {
        if (editingActivity) {
            setTitle(editingActivity.title);
            setDescription(editingActivity.description);
            setImageUrl(editingActivity.imageUrl || '');
            setSelectedClassId(editingActivity.classId || (teacherClasses.length > 0 ? teacherClasses[0].id : ''));
            setUnidade(editingActivity.unidade || '1ª Unidade');
            setMateria(editingActivity.materia || 'História');
            setDueDate(editingActivity.dueDate || '');
            setIsVisible(editingActivity.isVisible);
            setAllowLateSubmissions(editingActivity.allowLateSubmissions);
            
            if (editingActivity.items && editingActivity.items.length > 0) {
                setItems(editingActivity.items);
                if (editingActivity.gradingConfig) {
                    setGradingMode(editingActivity.gradingConfig.objectiveQuestions);
                }
            } else if (editingActivity.questions && editingActivity.questions.length > 0) {
                const convertedItems: ActivityItem[] = editingActivity.questions.map((q: any) => ({
                    id: q.id.toString(),
                    type: 'multiple_choice',
                    question: q.question,
                    options: q.choices,
                    correctOptionId: q.correctAnswerId,
                    points: Math.round(editingActivity.points / editingActivity.questions!.length)
                }));
                setItems(convertedItems);
            }
        }
    }, [editingActivity, teacherClasses]);

    // Handlers
    const addItem = (type: ActivityItemType) => {
        const newItem: ActivityItem = {
            id: crypto.randomUUID(),
            type,
            question: '',
            points: 1,
            ...(type === 'multiple_choice' ? {
                options: [{ id: '1', text: '' }, { id: '2', text: '' }],
                correctOptionId: '1'
            } : {})
        };
        setItems(prev => [...prev, newItem]);
    };

    const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

    const updateItem = (id: string, field: keyof ActivityItem, value: any) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const updateMCOption = (itemId: string, optionId: string, text: string) => {
        setItems(prev => prev.map(i => {
            if (i.id === itemId && i.options) {
                return { ...i, options: i.options.map(o => o.id === optionId ? { ...o, text } : o) };
            }
            return i;
        }));
    };

    const addMCOption = (itemId: string) => {
        setItems(prev => prev.map(i => {
            if (i.id === itemId && i.options) {
                const newId = (Math.max(...i.options.map(o => parseInt(o.id))) + 1).toString();
                return { ...i, options: [...i.options, { id: newId, text: '' }] };
            }
            return i;
        }));
    };

    const removeMCOption = (itemId: string, optionId: string) => {
        setItems(prev => prev.map(i => {
            if (i.id === itemId && i.options && i.options.length > 2) {
                return { ...i, options: i.options.filter(o => o.id !== optionId) };
            }
            return i;
        }));
    };

    const handleSave = async (isDraft: boolean = false) => {
        if (!title || !description || isSubmitting || isSubmittingContent || !user) return;
        if (!isDraft && !selectedClassId) { addToast('Selecione uma turma para publicar.', 'error'); return; }
        if (items.length === 0) { addToast('Adicione pelo menos uma questão.', 'error'); return; }

        setIsSubmitting(true);

        try {
            let attachmentPayload: { name: string; url: string; }[] = editingActivity?.attachmentFiles || [];
            const folderId = selectedClassId || 'drafts';

            if (attachments.length > 0) {
                addToast('Enviando anexos...', 'info');
                for (const file of attachments) {
                    const filePath = `activity_attachments/${folderId}/${user.id}/${Date.now()}-${file.name}`;
                    const storageRef = ref(storage, filePath);
                    await uploadBytes(storageRef, file);
                    const downloadUrl = await getDownloadURL(storageRef);
                    attachmentPayload.push({ name: file.name, url: downloadUrl });
                }
            }
            
            let className = '';
            if (selectedClassId) {
                const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
                className = selectedClass ? selectedClass.name : 'Turma sem nome';
            }

            const activityData: Partial<Activity> = {
                title, description, imageUrl,
                type: 'Mista',
                items,
                gradingConfig: { objectiveQuestions: gradingMode },
                points: totalPoints,
                classId: selectedClassId || null,
                className, 
                creatorId: user.id, creatorName: user.name,
                unidade, materia, isVisible, allowLateSubmissions,
                attachmentFiles: attachmentPayload,
            };

            if (dueDate) activityData.dueDate = dueDate;

            let success = false;
            if (isEditMode && editingActivity) {
                success = await handleUpdateActivity(editingActivity.id, activityData, isDraft);
            } else {
                success = await handleSaveActivity(activityData as Omit<Activity, 'id'>, isDraft);
            }
            
            if (success) {
                if (isEditMode) exitEditingActivity();
                setCurrentPage(isDraft ? 'teacher_repository' : 'teacher_dashboard');
            }

        } catch (error: any) {
            addToast(`Falha ao salvar atividade: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCancel = () => {
        if (isEditMode) exitEditingActivity();
        else setCurrentPage('teacher_dashboard');
    };

    // Render
    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center -mb-2">
                <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override">
                    Voltar
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6 flex items-center">
                            Informações Básicas
                        </h3>
                        <div className="space-y-6">
                            <InputField label="Título" required>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Revolução Industrial" className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={isSubmitting} />
                            </InputField>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Descrição/Instruções <span className="text-red-500">*</span></label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Instruções gerais..." className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={isSubmitting} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Turma">
                                     <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={isSubmitting}>
                                         <option value="">Selecione uma turma...</option>
                                         {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </InputField>
                                <InputField label="Matéria" required>
                                     <select value={materia} onChange={e => setMateria(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={isSubmitting}>
                                         {materiaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </InputField>
                            </div>
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Questões</h3>
                            <div className="flex space-x-2">
                                <button onClick={() => addItem('text')} disabled={isSubmitting} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                    + Texto
                                </button>
                                <button onClick={() => addItem('multiple_choice')} disabled={isSubmitting} className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-semibold rounded hover:bg-purple-100 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                                    + Múltipla Escolha
                                </button>
                            </div>
                        </div>

                        {items.length === 0 && (
                            <div className="text-center py-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                                <p className="text-slate-500">Nenhuma questão adicionada. Adicione questões de texto ou múltipla escolha acima.</p>
                            </div>
                        )}

                        {items.map((item, index) => (
                            <Card key={item.id} className="relative group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="absolute top-4 right-4">
                                    <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-1" title="Remover questão">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${item.type === 'text' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {item.type === 'text' ? 'Texto' : 'Objetiva'}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-500">Questão {index + 1}</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-grow">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Enunciado</label>
                                            <textarea 
                                                value={item.question} 
                                                onChange={e => updateItem(item.id, 'question', e.target.value)} 
                                                placeholder="Digite a pergunta..." 
                                                rows={2}
                                                className="w-full p-2 border rounded-md text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Pontos</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                step="0.1"
                                                value={item.points} 
                                                onChange={e => updateItem(item.id, 'points', parseFloat(e.target.value) || 0)} 
                                                className="w-full p-2 border rounded-md text-sm text-center font-bold dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {item.type === 'multiple_choice' && item.options && (
                                        <fieldset className="pl-4 border-l-2 border-purple-100 dark:border-purple-900/30 space-y-2">
                                            <legend className="text-xs font-bold text-slate-500 mb-2">Alternativas (Marque a correta)</legend>
                                            {item.options.map(opt => (
                                                <div key={opt.id} className="flex items-center gap-2">
                                                    <input 
                                                        type="radio" 
                                                        name={`correct-${item.id}`}
                                                        checked={item.correctOptionId === opt.id}
                                                        onChange={() => updateItem(item.id, 'correctOptionId', opt.id)}
                                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                        aria-label={`Marcar alternativa ${opt.id} como correta`}
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={opt.text} 
                                                        onChange={e => updateMCOption(item.id, opt.id, e.target.value)}
                                                        placeholder={`Opção ${opt.id}`}
                                                        className="flex-grow p-1.5 border rounded-md text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                    />
                                                    <button onClick={() => removeMCOption(item.id, opt.id)} className="text-slate-400 hover:text-red-500">×</button>
                                                </div>
                                            ))}
                                            <button onClick={() => addMCOption(item.id)} className="text-xs font-semibold text-purple-600 hover:underline mt-1">+ Adicionar Alternativa</button>
                                        </fieldset>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Sidebar Settings */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 dark:bg-slate-800 border-l-4 border-indigo-500">
                        <div className="text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase">Nota Total</p>
                            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{totalPoints}</p>
                            <p className="text-xs text-slate-400 mt-1">pontos distribuídos</p>
                        </div>
                    </Card>

                    <Card>
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Configurações</h4>
                        <div className="space-y-4">
                            <InputField label="Unidade">
                                <select value={unidade} onChange={e => setUnidade(e.target.value as Unidade)} className="w-full p-2 border rounded-md text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                    <option>1ª Unidade</option>
                                    <option>2ª Unidade</option>
                                    <option>3ª Unidade</option>
                                    <option>4ª Unidade</option>
                                </select>
                            </InputField>
                            
                            <InputField label="Prazo de Entrega">
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                            </InputField>

                            <div className="pt-4 border-t dark:border-slate-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Correção Objetiva</label>
                                <div className="flex flex-col space-y-2">
                                    <label className="flex items-center">
                                        <input type="radio" name="gradingMode" checked={gradingMode === 'automatic'} onChange={() => setGradingMode('automatic')} className="text-indigo-600" />
                                        <span className="ml-2 text-sm dark:text-slate-300">Automática (Calculada pelo sistema)</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="radio" name="gradingMode" checked={gradingMode === 'manual'} onChange={() => setGradingMode('manual')} className="text-indigo-600" />
                                        <span className="ml-2 text-sm dark:text-slate-300">Manual (Professor revisa tudo)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t dark:border-slate-700 space-y-2">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="rounded text-indigo-600" />
                                    <span className="ml-2 text-sm dark:text-slate-300">Visível para alunos</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" checked={allowLateSubmissions} onChange={e => setAllowLateSubmissions(e.target.checked)} className="rounded text-indigo-600" />
                                    <span className="ml-2 text-sm dark:text-slate-300">Aceitar atrasos</span>
                                </label>
                            </div>
                        </div>
                    </Card>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => handleSave(false)} 
                            disabled={!title || !description || !selectedClassId || isSubmitting} 
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg disabled:opacity-50 flex justify-center items-center hc-button-primary-override"
                        >
                            {isSubmitting ? <SpinnerIcon className="h-5 w-5" /> : ICONS.plus}
                            <span className="ml-2">{isEditMode ? 'Salvar Alterações' : 'Publicar Atividade'}</span>
                        </button>
                        <button 
                            onClick={() => handleSave(true)} 
                            disabled={!title || isSubmitting} 
                            className="w-full py-2 bg-amber-100 text-amber-900 font-semibold rounded-lg hover:bg-amber-200 border border-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
                        >
                            Salvar Rascunho
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateActivity;
