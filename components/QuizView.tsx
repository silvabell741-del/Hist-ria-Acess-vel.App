import React, { useState } from 'react';
import type { Quiz, QuizQuestion } from '../types';
import { SpinnerIcon } from '../constants/index';

interface QuizViewProps {
    quiz?: Quiz;
    questions?: QuizQuestion[];
    onQuizComplete: (quizId: string, quizTitle: string, score: number, total: number) => Promise<number>;
}

// Helper to extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const QuestionMedia: React.FC<{ url: string }> = ({ url }) => {
    const [imgError, setImgError] = useState(false);
    const videoId = getYouTubeVideoId(url);

    if (videoId) {
        return (
            <div className="my-4 aspect-video">
               <iframe 
                    className="w-full h-full rounded-lg shadow-md"
                    src={`https://www.youtube.com/embed/${videoId}`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                ></iframe>
            </div>
        );
    }
    
    // Assume it's an image if not a YouTube video
    if (imgError || !url) {
        return (
            <div className="my-4 rounded-lg shadow-md max-h-72 mx-auto flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 aspect-video">
                <div className="text-center p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xs mt-2 font-semibold">Falha ao carregar imagem da questão.</p>
                </div>
            </div>
        );
    }

    return (
        <img src={url} alt="Mídia da questão" className="my-4 rounded-lg shadow-md max-h-72 mx-auto" onError={() => setImgError(true)} loading="lazy" />
    );
};


export const QuizView: React.FC<QuizViewProps> = ({ quiz, questions: questionsFromProps, onQuizComplete }) => {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [xpAwarded, setXpAwarded] = useState<number | null>(null);

    const questions = quiz?.questions || questionsFromProps;
    if (!questions) {
        return <p>Questões não encontradas.</p>;
    }
    const quizId = quiz?.id || '';
    const quizTitle = quiz?.title || 'Quiz';

    const handleAnswerChange = (questionId: number, choiceId: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: choiceId }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        let currentScore = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswerId) {
                currentScore++;
            }
        });
        
        const xp = await onQuizComplete(quizId, quizTitle, currentScore, questions.length);
        
        setXpAwarded(xp);
        setScore(currentScore);
        setSubmitted(true);
        // No need to set isSubmitting back to false, as the view changes.
    };

    if (submitted) {
         const attempts = quiz?.attempts;
         const xpMessage = xpAwarded !== null 
            ? xpAwarded > 0 
                ? `Você ganhou ${xpAwarded} XP!`
                : `Você não ganhou XP desta vez. O XP é concedido apenas nas duas primeiras tentativas.`
            : 'Calculando XP...';

        return (
            <div className="text-center">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 hc-text-primary">Quiz Finalizado!</h2>
                <p 
                    className="text-lg text-slate-600 dark:text-slate-300 mb-2 hc-text-secondary"
                    role="alert"
                >
                    Você acertou <span className="font-bold text-green-600 dark:text-green-400">{score}</span> de <span className="font-bold">{questions.length}</span> perguntas.
                </p>
                {attempts && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Este quiz foi feito {attempts} vez(es).</p>}
                <p className="font-semibold text-indigo-600 dark:text-indigo-400 hc-link-override">{xpMessage}</p>
                <div className="text-left mt-6 space-y-4">
                    {questions.map((q, index) => (
                        <div key={q.id} className="p-4 rounded-lg bg-slate-50 border dark:bg-slate-700/50 dark:border-slate-700 hc-bg-override hc-border-override">
                            <p className="font-semibold hc-text-primary">{index + 1}. {q.question}</p>
                            {q.mediaUrl && <QuestionMedia url={q.mediaUrl} />}
                            <div className="mt-2 space-y-1 text-sm">
                                {q.choices.map(choice => {
                                    const isCorrect = choice.id === q.correctAnswerId;
                                    const isSelected = choice.id === answers[q.id];
                                    let color = 'text-slate-700 dark:text-slate-300 hc-text-secondary';
                                    if(isCorrect) color = 'text-green-600 dark:text-green-400 font-bold';
                                    else if(isSelected && !isCorrect) color = 'text-red-600 dark:text-red-400';

                                    return <p key={choice.id} className={color}>{choice.text} {isCorrect && '✓'}</p>
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">Teste seu conhecimento</h2>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    {questions.map((q, index) => (
                        <fieldset key={q.id}>
                             {q.mediaUrl && <QuestionMedia url={q.mediaUrl} />}
                            <legend className="font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">{index + 1}. {q.question}</legend>
                            <div className="mt-2 space-y-2">
                                {q.choices.map(choice => (
                                    <label key={choice.id} className="flex items-center p-3 rounded-lg border border-slate-200 has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400 cursor-pointer dark:border-slate-700 dark:has-[:checked]:bg-indigo-500/20 dark:has-[:checked]:border-indigo-500">
                                        <input
                                            type="radio"
                                            name={`question-${q.id}`}
                                            value={choice.id}
                                            checked={answers[q.id] === choice.id}
                                            onChange={() => handleAnswerChange(q.id, choice.id)}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 focus-visible:ring-indigo-500"
                                        />
                                        <span className="ml-3 text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">{choice.text}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                </div>
                <button
                    type="submit"
                    disabled={Object.keys(answers).length !== questions.length || isSubmitting}
                    className="mt-8 w-full bg-green-200 text-green-900 font-semibold py-3 px-4 rounded-lg hover:bg-green-300 transition-colors disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed flex justify-center items-center dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 hc-button-primary-override"
                >
                    {isSubmitting ? (
                        <>
                            <SpinnerIcon className="h-5 w-5 text-green-900 dark:text-green-200" />
                            Finalizando...
                        </>
                    ) : (
                        'Finalizar Quiz'
                    )}
                </button>
            </form>
        </div>
    );
};