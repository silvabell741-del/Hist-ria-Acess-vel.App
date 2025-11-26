
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { useSettings, Theme } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const schoolYears = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];


const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    
    const { theme, setTheme, isHighContrastText, setIsHighContrastText } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [series, setSeries] = useState(user?.series || '');
    
    useEffect(() => {
        setName(user?.name || '');
        setSeries(user?.series || '');
    }, [user]);

    const handleSave = () => {
        if (!user) return;
        updateUser({ ...user, name, series });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setName(user?.name || '');
        setSeries(user?.series || '');
        setIsEditing(false);
    }

     const themes: { id: Theme; label: string }[] = [
        { id: 'light', label: 'Claro' },
        { id: 'dark', label: 'Escuro' },
        { id: 'midnight', label: 'Midnight (Moderno)' },
        { id: 'morning-tide', label: 'Maré do Amanhecer' },
        { id: 'akebono-dawn', label: 'アケボノ (Akebono)' },
        { id: 'dragon-year', label: '龙年 (Dragão)' },
        { id: 'galactic-aurora', label: 'Aurora' },
        { id: 'emerald-sovereignty', label: 'Soberania' },
        { id: 'itoshi-sae', label: 'Domínio Numérico' },
        { id: 'sorcerer-supreme', label: 'Muryōkūsho' },
        { id: 'mn', label: 'MN' },
        { id: 'high-contrast', label: 'Alto Contraste' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <p className="text-slate-500 dark:text-slate-400 -mt-6 hc-text-secondary">Gerencie suas informações e acompanhe seu progresso</p>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override">
                        Editar Perfil
                    </button>
                )}
            </div>

            <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 hc-text-primary">Informações Pessoais</h2>
                <div className="flex justify-between items-center mb-4">
                    
                    {isEditing && (
                        <div className="flex space-x-2">
                            <button onClick={handleCancel} className="px-4 py-1.5 text-sm bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500 hc-button-override">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override">Salvar</button>
                        </div>
                    )}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Nome Completo</label>
                        {isEditing ? (
                             <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                        ) : (
                            <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.name ?? 'Carregando...'}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Email</label>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.email ?? 'Carregando...'}</p>
                    </div>
                     {userRole === 'aluno' && (
                        <div>
                            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Ano Escolar</label>
                            {isEditing ? (
                                <select value={series} onChange={e => setSeries(e.target.value)} className="w-full font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                                    {schoolYears.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            ) : (
                                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.series ?? 'Não definido'}</p>
                            )}
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Papel no Sistema</label>
                        <p className="font-semibold text-blue-600 dark:text-blue-400 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-link-override hc-border-override capitalize">{userRole ?? 'N/A'}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 hc-text-primary">Preferências de Acessibilidade</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Tema de cores</label>
                        <div className="mt-1 flex flex-wrap gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                            {themes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    aria-pressed={theme === t.id}
                                    className={`flex-1 min-w-[100px] px-4 py-1.5 text-sm font-semibold rounded-md transition ${
                                        theme === t.id
                                            ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white ring-2 ring-indigo-500/20'
                                            : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10'
                                    } hc-button-override`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700 hc-border-override">
                        <label htmlFor="high-contrast-text-toggle" className="text-sm font-medium text-slate-700 dark:text-slate-300 hc-text-secondary">
                            Texto em Alto Contraste
                        </label>
                        <button
                            id="high-contrast-text-toggle"
                            type="button"
                            role="switch"
                            aria-checked={isHighContrastText}
                            onClick={() => setIsHighContrastText(!isHighContrastText)}
                            className={`${isHighContrastText ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800`}
                        >
                            <span className="sr-only">Ativar texto em alto contraste</span>
                            <span className={`${isHighContrastText ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`} />
                        </button>
                    </div>
                </div>
            </Card>
            
             <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 hc-text-primary">Atalhos de Teclado</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 hc-text-secondary">Navegue mais rápido usando as teclas <kbd className="font-sans px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Alt</kbd> + <kbd className="font-sans px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Letra</kbd>.</p>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-300 hc-text-primary">
                    {userRole === 'aluno' ? (
                        <>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">D</kbd> - Dashboard</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">M</kbd> - Módulos</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">Q</kbd> - Quizzes</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">A</kbd> - Atividades</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">C</kbd> - Conquistas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">T</kbd> - Turmas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">P</kbd> - Perfil</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">N</kbd> - Notificações</li>
                        </>
                    ) : (
                        <>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">D</kbd> - Dashboard</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">M</kbd> - Minhas Turmas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">B</kbd> - Módulos</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">C</kbd> - Criar Módulo</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">A</kbd> - Criar Atividade</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">E</kbd> - Estatísticas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">P</kbd> - Perfil</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">N</kbd> - Notificações</li>
                        </>
                    )}
                </ul>
            </Card>
        </div>
    );
};

export default Profile;
