import React, { useState } from 'react';

interface YearSelectionPageProps {
    onYearSelected: (year: string) => void;
    error?: string | null;
}

const schoolYears = [
    "6º Ano",
    "7º Ano",
    "8º Ano",
    "9º Ano",
    "1º Ano (Ensino Médio)",
    "2º Ano (Ensino Médio)",
    "3º Ano (Ensino Médio)",
];

export const YearSelectionPage: React.FC<YearSelectionPageProps> = ({ onYearSelected, error }) => {
    const [selectedYear, setSelectedYear] = useState<string>(schoolYears[0]);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 hc-bg-override">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 space-y-6 hc-bg-override hc-border-override">
                <div className="text-center space-y-2">
                    <div className="inline-block bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-full">
                         <span className="text-4xl" role="img" aria-label="Livros">📚</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 hc-text-override">Quase lá!</h1>
                    <p className="text-gray-500 dark:text-slate-400 hc-text-override">Para personalizar sua experiência, por favor, selecione seu ano escolar.</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-4 rounded-lg text-sm text-red-700 dark:text-red-300" role="alert">
                        <p className="font-bold mb-2">Ocorreu um Erro ao Criar seu Perfil</p>
                        <p className="whitespace-pre-wrap">{error}</p>
                    </div>
                )}

                <div className="space-y-4">
                     <div>
                        <label htmlFor="school-year" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
                           Ano Escolar
                        </label>
                        <select
                            id="school-year"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        >
                            {schoolYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button 
                    onClick={() => onYearSelected(selectedYear)}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 hc-button-primary-override"
                >
                    Confirmar e Entrar
                </button>
            </div>
        </div>
    );
};