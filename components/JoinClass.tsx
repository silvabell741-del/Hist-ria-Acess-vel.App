
import React, { useState } from 'react';
import type { TeacherClass, ClassNotice } from '../types';
import { Card } from './common/Card';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { Modal } from './common/Modal';
import { useSettings } from '../contexts/SettingsContext';

// --- Local Components for Class Details ---

const NoticeListItem: React.FC<{ notice: ClassNotice }> = ({ notice }) => {
    const { theme } = useSettings();
    const isAurora = theme === 'galactic-aurora';
    const isDragon = theme === 'dragon-year';
    const isEmerald = theme === 'emerald-sovereignty';
    
    let iconBgClass = 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300';
    
    if (isAurora) {
        iconBgClass = 'bg-[#2E2F3E] text-[#4CC9F0]';
    } else if (isDragon) {
        iconBgClass = 'bg-[#7F1D1D] text-[#FFD700] border border-[#FFD700]'; // Red bg, Gold icon
    } else if (isEmerald) {
        iconBgClass = 'bg-[#34D399] text-black shadow-[0_0_10px_rgba(52,211,153,0.5)]'; // Neon Green Orb
    }

    return (
        <div className="flex items-start space-x-4 p-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hc-border-override">
            <div className={`flex-shrink-0 p-2 rounded-full ${iconBgClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 12.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3-3z" />
                </svg>
            </div>
            <div>
                <p className="text-sm text-slate-700 dark:text-slate-200 hc-text-primary">{notice.text}</p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 hc-text-secondary">
                    Postado por {notice.author} - {new Date(notice.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
            </div>
        </div>
    );
};

const ClassAccordion: React.FC<{
    classData: TeacherClass;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onLeaveClick: (classId: string, className: string) => void;
}> = ({ classData, isExpanded, onToggleExpand, onLeaveClick }) => {
    const { theme } = useSettings();
    const isAurora = theme === 'galactic-aurora';
    const isDragon = theme === 'dragon-year';
    const isEmerald = theme === 'emerald-sovereignty';
    
    // UX FASE 3: Usar contadores desnormalizados (metadados) se disponíveis, senão usar o tamanho local.
    const totalNoticeCount = classData.noticeCount ?? classData.notices?.length ?? 0;

    // Estilos condicionais
    let buttonHoverClass = 'hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:bg-slate-50 dark:focus:bg-slate-700/50';
    let expandedContainerBg = 'bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700';
    let listContainerClass = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

    if (isAurora) {
        buttonHoverClass = 'hover:bg-[#1a1b26] focus:bg-[#1a1b26]';
        expandedContainerBg = 'bg-[#0F1014] border-t border-[#2E2F3E]';
        listContainerClass = 'bg-[#181920] border-[#2E2F3E]';
    } else if (isDragon) {
        buttonHoverClass = 'hover:bg-[#e8dfcc] focus:bg-[#e8dfcc]'; // Slightly darker parchment
        expandedContainerBg = 'bg-[#e8dfcc] border-t border-[#d7ccc8]';
        listContainerClass = 'bg-[#fff8e7] border-[#d7ccc8]';
    } else if (isEmerald) {
        buttonHoverClass = 'hover:bg-[#374151] focus:bg-[#374151]'; // Steel Hover
        expandedContainerBg = 'bg-[#111827] border-t border-[#374151]'; // Darker Gunmetal
        listContainerClass = 'bg-[#1F2937] border-[#374151]'; // Gunmetal
    }

    return (
        <Card className="!p-0 overflow-hidden transition-all duration-300">
            <button 
                type="button"
                className={`w-full text-left p-4 cursor-pointer flex justify-between items-center focus:outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${buttonHoverClass}`} 
                onClick={onToggleExpand} 
                aria-expanded={isExpanded} 
                aria-controls={`class-content-${classData.id}`}
            >
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{classData.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">
                        <span>{classData.code}</span>
                        {totalNoticeCount > 0 && (
                            <span className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium">
                                <div className="h-4 w-4 mr-1">{ICONS.notifications}</div>
                                {totalNoticeCount} Avisos
                            </span>
                        )}
                    </div>
                </div>
                <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
            </button>

            {isExpanded && (
                <div className={`${expandedContainerBg} hc-border-override`} id={`class-content-${classData.id}`}>
                    <div className="p-4">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                            <div className="h-4 w-4 mr-2">{ICONS.notifications}</div>
                            Mural de Avisos
                        </h4>
                        {(classData.notices?.length || 0) > 0 ? (
                            <ul className={`rounded-lg border overflow-hidden ${listContainerClass}`}>
                                {classData.notices?.map(notice => <NoticeListItem key={notice.id} notice={notice} />)}
                            </ul>
                        ) : (
                            <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum aviso postado nesta turma.</p>
                            </div>
                        )}
                        
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onLeaveClick(classData.id, classData.name);
                                }}
                                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold flex items-center px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors relative z-10"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sair da Turma
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

const JoinClass: React.FC = () => {
    const { studentClasses, handleJoinClass, handleLeaveClass } = useStudentAcademic();
    const { theme } = useSettings();
    const [classCode, setClassCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [classToLeave, setClassToLeave] = useState<{id: string, name: string} | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    
    const safeStudentClasses = studentClasses || [];

    const onJoin = async () => {
        if (!classCode.trim() || isJoining) return;
        setIsJoining(true);
        const success = await handleJoinClass(classCode.trim().toUpperCase());
        setIsJoining(false);
        if (success) {
            setClassCode('');
        }
    };

    const handleLeaveClick = (classId: string, className: string) => {
        setClassToLeave({ id: classId, name: className });
        setIsLeaveModalOpen(true);
    };

    const confirmLeave = async () => {
        if (!classToLeave || isLeaving) return;
        setIsLeaving(true);
        try {
            await handleLeaveClass(classToLeave.id);
            setIsLeaveModalOpen(false);
            setClassToLeave(null);
        } catch (error) {
            // Erro já tratado no hook com toast
        } finally {
            setIsLeaving(false);
        }
    };

    let cardGradientClass = 'bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-red-900/40 dark:to-black';
    let buttonClass = 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300 dark:bg-indigo-500/40 dark:text-indigo-200 dark:hover:bg-indigo-500/60';

    if (theme === 'galactic-aurora') {
        cardGradientClass = 'bg-gradient-to-br from-red-900 to-black';
        buttonClass = 'bg-[#580079] text-white hover:bg-[#450060] dark:bg-[#580079] dark:text-white dark:hover:bg-[#450060]';
    } else if (theme === 'dragon-year') {
        cardGradientClass = 'bg-gradient-to-br from-[#5D0E0E] to-[#2b1b17]'; // Deep Ruby to Black
        buttonClass = 'bg-[#FFD700] text-[#5D0E0E] font-bold hover:bg-[#e6c200] border border-[#b71c1c]'; // Gold button
    } else if (theme === 'emerald-sovereignty') {
        cardGradientClass = 'bg-gradient-to-br from-[#064E3B] to-[#020403] border border-[#D4AF37]'; // Emerald to Black
        buttonClass = 'bg-[#D4AF37] text-[#064E3B] font-bold hover:bg-[#B59632]'; // Gold Button
    } else if (theme === 'sorcerer-supreme') {
        cardGradientClass = 'bg-gradient-to-br from-[#0f172a] to-[#312e81] border border-[#0ea5e9]/30'; // Dark Blue/Indigo void
        buttonClass = 'bg-[#0ea5e9] text-white hover:bg-[#0284c7]'; // Cyan button
    }

    return (
        <div className="space-y-8">
            <p className="text-slate-500 dark:text-slate-400 -mt-6 hc-text-secondary">Use o código fornecido pelo seu professor para entrar em uma turma.</p>

            <Card className={cardGradientClass}>
                <div className="flex flex-col items-center text-center">
                    <div className={`${theme === 'dragon-year' ? 'bg-[#FFD700] text-[#5D0E0E]' : theme === 'emerald-sovereignty' ? 'bg-[#D4AF37] text-[#064E3B]' : theme === 'sorcerer-supreme' ? 'bg-[#0ea5e9] text-white' : 'bg-blue-500 text-white'} rounded-full p-4 mb-4`}>
                        {ICONS.join_class}
                    </div>
                    <h2 className={`text-xl font-bold ${['dragon-year', 'galactic-aurora', 'emerald-sovereignty', 'sorcerer-supreme'].includes(theme) ? 'text-white' : 'text-slate-800 dark:text-slate-100'} mb-2 hc-text-primary`}>Entrar em Nova Turma</h2>
                    <p className={`text-sm ${['dragon-year', 'galactic-aurora', 'emerald-sovereignty', 'sorcerer-supreme'].includes(theme) ? 'text-gray-300' : 'text-slate-500 dark:text-slate-400'} mb-4 hc-text-secondary`}>Código da Turma</p>
                    <div className="flex w-full max-w-sm">
                        <input 
                            type="text" 
                            value={classCode}
                            onChange={(e) => setClassCode(e.target.value)}
                            placeholder="Digite o código (ex: ABC123XY)"
                            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                        <button 
                            onClick={onJoin}
                            disabled={isJoining}
                            className={`w-28 px-6 py-2 font-semibold rounded-r-lg transition hc-button-primary-override disabled:opacity-50 flex justify-center items-center ${buttonClass}`}
                        >
                            {isJoining ? <SpinnerIcon /> : 'Entrar'}
                        </button>
                    </div>
                </div>
            </Card>

            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">Minhas Turmas ({safeStudentClasses.length})</h2>
                {safeStudentClasses.length > 0 ? (
                    <ul className="space-y-4">
                        {safeStudentClasses.map(cls => (
                             <li key={cls.id}>
                                <ClassAccordion
                                    classData={cls}
                                    isExpanded={expandedClassId === cls.id}
                                    onToggleExpand={() => setExpandedClassId(prev => prev === cls.id ? null : cls.id)}
                                    onLeaveClick={handleLeaveClass}
                                />
                             </li>
                        ))}
                    </ul>
                ) : (
                     <Card className="text-center py-12">
                         <p className="text-slate-500 dark:text-slate-400 hc-text-secondary">Você não está em nenhuma turma.</p>
                    </Card>
                )}
            </div>

            {/* Modal de Confirmação de Saída */}
            <Modal 
                isOpen={isLeaveModalOpen} 
                onClose={() => !isLeaving && setIsLeaveModalOpen(false)} 
                title="Sair da Turma"
            >
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300">
                        Você tem certeza que deseja sair da turma <strong>{classToLeave?.name}</strong>?
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-start">
                            <span className="mr-2">⚠️</span>
                            <span>Seus dados e histórico de atividades serão mantidos na escola, mas você deixará de ver esta turma na sua lista.</span>
                        </p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button 
                            onClick={() => setIsLeaveModalOpen(false)}
                            disabled={isLeaving}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmLeave}
                            disabled={isLeaving}
                            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center disabled:opacity-50"
                        >
                            {isLeaving ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                            Confirmar Saída
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default JoinClass;
