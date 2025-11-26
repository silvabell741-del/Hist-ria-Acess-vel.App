
import React, { useState } from 'react';
import { Card } from './common/Card';
import { QuizQuestion, QuizChoice } from '../types';

interface QuizCreatorProps {
    onSave: (quizData: {
        title: string;
        description: string;
        series?: string;
        materia?: string;
        questions: QuizQuestion[];
    }) => void;
    initialData?: {
        title: string;
        description: string;
        series?: string;
        materia?: string;
        questions: QuizQuestion[];
    };
}

const QuizCreator: React.FC<QuizCreatorProps> = ({ onSave, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [series, setSeries] = useState(initialData?.series || '');
    const [materia, setMateria] = useState(initialData?.materia || '');
    const [questions, setQuestions] = useState<QuizQuestion[]>(initialData?.questions || []);

    const handleAddQuestion = () => {
        setQuestions(prev => [
            ...prev,
            {
                id: prev.length + 1,
                question: '',
                choices: [],
                correctAnswerId: ''
            }
        ]);
    };

    const handleQuestionChange = (index: number, field: keyof QuizQuestion, value: any) => {
        const updated = [...questions];
        (updated[index] as any)[field] = value;
        setQuestions(updated);
    };

    const handleAddChoice = (qIndex: number) => {
        const updated = [...questions];
        updated[qIndex].choices.push({
            id: crypto.randomUUID(),
            text: ''
        });
        setQuestions(updated);
    };

    const handleChoiceChange = (qIndex: number, cIndex: number, value: string) => {
        const updated = [...questions];
        updated[qIndex].choices[cIndex].text = value;
        setQuestions(updated);
    };

    const handleSave = () => {
        onSave({
            title,
            description,
            series,
            materia,
            questions
        });
    };

    return (
        <Card className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Criar Quiz</h2>

            <div className="space-y-2">
                <label className="font-semibold">Título</label>
                <input
                    className="w-full p-2 border rounded"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="font-semibold">Descrição</label>
                <textarea
                    className="w-full p-2 border rounded"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="font-semibold">Série</label>
                    <input
                        className="w-full p-2 border rounded"
                        value={series}
                        onChange={e => setSeries(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="font-semibold">Matéria</label>
                    <input
                        className="w-full p-2 border rounded"
                        value={materia}
                        onChange={e => setMateria(e.target.value)}
                    />
                </div>
            </div>

            <hr className="my-4 border-slate-300 dark:border-slate-700" />

            <h3 className="text-xl font-semibold">Questões</h3>

            <button
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
                Adicionar Questão
            </button>

            <div className="space-y-6 mt-4">
                {questions.map((q, qIndex) => (
                    <Card key={q.id} className="p-4 space-y-4">
                        <div className="space-y-2">
                            <label className="font-semibold">Pergunta {qIndex + 1}</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={q.question}
                                onChange={e =>
                                    handleQuestionChange(qIndex, 'question', e.target.value)
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="font-semibold">Alternativas</label>
                            {q.choices.map((c, cIndex) => (
                                <input
                                    key={c.id}
                                    className="w-full p-2 border rounded mb-2"
                                    value={c.text}
                                    onChange={e =>
                                        handleChoiceChange(qIndex, cIndex, e.target.value)
                                    }
                                />
                            ))}

                            <button
                                onClick={() => handleAddChoice(qIndex)}
                                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded"
                            >
                                + Alternativa
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="font-semibold">Resposta correta</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={q.correctAnswerId}
                                onChange={e =>
                                    handleQuestionChange(
                                        qIndex,
                                        'correctAnswerId',
                                        e.target.value
                                    )
                                }
                            >
                                <option value="">Selecione</option>
                                {q.choices.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.text || '(vazio)'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </Card>
                ))}
            </div>

            <button
                onClick={handleSave}
                className="mt-6 w-full py-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
            >
                Salvar Quiz
            </button>
        </Card>
    );
};

export default QuizCreator;
