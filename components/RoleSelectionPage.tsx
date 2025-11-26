import React from 'react';
import type { Role } from '../types';

const Logo: React.FC = () => (
    <div className="flex items-center space-x-2">
        <div className="bg-green-500 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        </div>
        <div>
            <h1 className="font-bold text-lg leading-tight text-slate-800 dark:text-slate-200 hc-text-override">História</h1>
            <p className="text-sm leading-tight text-slate-500 dark:text-slate-400 hc-text-override">Acessível</p>
        </div>
    </div>
);

const StudentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
);

const ProfessorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

const AdminIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />
    </svg>
);

interface RoleSelectionPageProps {
    onRoleSelected: (role: Role) => void;
    error?: string | null;
}

export const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({ onRoleSelected, error }) => {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 hc-bg-override">
            <div className="max-w-sm w-full space-y-8">
                <div className="flex justify-center">
                    <Logo />
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 space-y-6 hc-bg-override hc-border-override">
                    <div className="space-y-1 text-center">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 hc-text-override">Selecione seu Perfil</h1>
                        <p className="text-gray-500 dark:text-slate-400 text-sm hc-text-override">Esta escolha será salva para seus próximos acessos.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-4 rounded-lg text-sm text-red-700 dark:text-red-300" role="alert">
                            <p className="font-bold mb-2">Ocorreu um Erro ao Criar seu Perfil</p>
                            <p className="whitespace-pre-wrap">{error}</p>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => onRoleSelected('aluno')}
                            className="w-full flex items-center justify-center py-3 px-4 border border-indigo-300 rounded-lg shadow-sm text-base font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-700 dark:hover:bg-indigo-900 hc-button-override"
                        >
                            <StudentIcon />
                            <span className="ml-3">Sou Aluno</span>
                        </button>
                        <button 
                            onClick={() => onRoleSelected('professor')}
                             className="w-full flex items-center justify-center py-3 px-4 border border-sky-300 rounded-lg shadow-sm text-base font-medium text-sky-700 bg-sky-100 hover:bg-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition-colors dark:bg-sky-900/50 dark:text-sky-200 dark:border-sky-700 dark:hover:bg-sky-900 hc-button-override"
                        >
                            <ProfessorIcon />
                             <span className="ml-3">Sou Professor</span>
                        </button>
                         <button 
                            onClick={() => onRoleSelected('admin')}
                             className="w-full flex items-center justify-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-base font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500 transition-colors dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 hc-button-override"
                        >
                            <AdminIcon />
                             <span className="ml-3">Sou Administrador</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};