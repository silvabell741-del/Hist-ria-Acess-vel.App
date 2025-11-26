
import React, { useState, useMemo } from 'react';
import type { Activity, ActivitySubmission, ActivityItem } from '../../types';
import { SpinnerIcon } from '../../constants/index';
import { Modal } from './Modal';

// Helper to parse answers JSON safely
const parseAnswers = (content: string) => {
    try {
        return JSON.parse(content);
    } catch {
        return null; // Legacy content is plain text
    }
};

interface SubmissionItemProps {
    submission: ActivitySubmission;
    activity: Activity;
    onGrade: (studentId: string, grade: number, feedback: string) => Promise<boolean>;
}

const SubmissionItem: React.FC<SubmissionItemProps> = ({ submission, activity, onGrade }) => {
    const [grade, setGrade] = useState<string>(submission.grade?.toString() || '');
    const [feedback, setFeedback] = useState<string>(submission.feedback || '');
    const [isSaving, setIsSaving] = useState(false);

    const items = activity.items || [];
    const answers = useMemo(() => parseAnswers(submission.content), [submission.content]);
    const isLegacy = !answers;

    const handleSaveGrade = async () => {
        const gradeNumber = parseFloat(grade.replace(',', '.'));
        if (isNaN(gradeNumber) || gradeNumber < 0 || gradeNumber > activity.points || isSaving) {
            alert(`Por favor, insira uma nota válida entre 0 e ${activity.points}.`);
            return;
        }

        setIsSaving(true);
        await onGrade(submission.studentId, gradeNumber, feedback);
    };

    return (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-start">
                 <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{submission.studentName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {submission.submissionDate
                            ? `Enviado em: ${new Date(submission.submissionDate).toLocaleString('pt-BR')}`
                            : 'Data de envio não disponível'
                        }
                    </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${submission.status === 'Corrigido' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                    {submission.status}
                </span>
            </div>
            
            {isLegacy ? (
                <div className="p-3 bg-white dark:bg-slate-800 rounded border dark:border-slate-600">
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{submission.content}</p>
                </div>
            ) : (
                <div className="space-y-3 mt-2">
                    {items.map((item, idx) => {
                        const studentAnswer = answers[item.id];
                        const isMC = item.type === 'multiple_choice';
                        
                        let displayText = studentAnswer;
                        let isCorrect = false;

                        if (isMC) {
                            const option = item.options?.find(o => o.id === studentAnswer);
                            displayText = option?.text || '(Sem resposta)';
                            isCorrect = studentAnswer === item.correctOptionId;
                        }

                        return (
                            <div key={item.id} className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Questão {idx + 1} ({item.points} pts)</span>
                                    {isMC && (
                                        <span className={isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                            {isCorrect ? "Correto" : "Incorreto"}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">{item.question}</p>
                                <div className={`p-2 rounded text-sm ${isMC && isCorrect ? 'bg-green-50 dark:bg-green-900/20' : isMC && !isCorrect ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-900'}`}>
                                    <span className="font-bold mr-2">R:</span> {displayText}
                                </div>
                                {isMC && !isCorrect && (
                                    <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                                        Correto: {item.options?.find(o => o.id === item.correctOptionId)?.text}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-600 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                        <label htmlFor={`grade-${submission.studentId}`} className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Nota (de {activity.points})</label>
                        <input
                            id={`grade-${submission.studentId}`}
                            type="number"
                            step="any"
                            value={grade}
                            onChange={e => setGrade(e.target.value)}
                            max={activity.points}
                            min={0}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                     <div className="sm:col-span-2">
                         <label htmlFor={`feedback-${submission.studentId}`} className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Feedback</label>
                        <textarea
                            id={`feedback-${submission.studentId}`}
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            rows={2}
                            placeholder="Escreva um feedback..."
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                </div>
                 <button
                    onClick={handleSaveGrade}
                    disabled={isSaving}
                    className="w-full sm:w-auto float-right px-4 py-2 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40"
                >
                    {isSaving && <SpinnerIcon className="h-5 w-5 mr-2" />}
                    {submission.status === 'Corrigido' ? 'Atualizar Correção' : 'Salvar Correção'}
                </button>
            </div>
        </div>
    );
};

interface SubmissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: Activity;
    onGradeActivity: (activityId: string, studentId: string, grade: number, feedback: string) => Promise<boolean>;
}

export const SubmissionsModal: React.FC<SubmissionsModalProps> = ({ isOpen, onClose, activity, onGradeActivity }) => {
    const onGrade = async (studentId: string, grade: number, feedback: string): Promise<boolean> => {
        const success = await onGradeActivity(activity.id, studentId, grade, feedback);
        if (success) {
            onClose();
        }
        return success;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Respostas para: ${activity.title}`}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                {activity.submissions && activity.submissions.length > 0 ? (
                    activity.submissions.map((sub) => (
                        <SubmissionItem
                            key={sub.studentId}
                            submission={sub}
                            activity={activity}
                            onGrade={onGrade}
                        />
                    ))
                ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">Nenhuma resposta foi enviada ainda.</p>
                )}
            </div>
        </Modal>
    );
}
