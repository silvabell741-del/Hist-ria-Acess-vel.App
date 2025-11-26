
import React, { useState, useCallback, useEffect } from 'react';
import type { TeacherClass, Student, ClassNotice, Activity, User, ClassInvitation } from '../types';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useTeacherCommunicationContext } from '../contexts/TeacherCommunicationContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './common/Modal';
import { SubmissionsModal } from './common/SubmissionsModal';

// Helper for input fields for consistency
const InputField: React.FC<{ label: string, required?: boolean, children: React.ReactNode }> = ({ label, required, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

// --- Components for Invites ---
const PendingInviteCard: React.FC<{ invitation: ClassInvitation, onAccept: () => void, onDecline: () => void, isProcessing: boolean }> = ({ invitation, onAccept, onDecline, isProcessing }) => (
    <Card className="border-l-4 border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Convite para Co-Docência</h3>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                    O professor <span className="font-semibold">{invitation.inviterName}</span> convidou você para lecionar 
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400"> {invitation.subject}</span> na turma 
                    <span className="font-semibold"> {invitation.className}</span>.
                </p>
                <p className="text-xs text-slate-500 mt-2">{new Date(invitation.timestamp).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <button 
                    onClick={onDecline}
                    disabled={isProcessing}
                    className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                >
                    Recusar
                </button>
                <button 
                    onClick={onAccept}
                    disabled={isProcessing}
                    className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center"
                >
                    {isProcessing ? <SpinnerIcon className="w-5 h-5" /> : 'Aceitar'}
                </button>
            </div>
        </div>
    </Card>
);

// Modal for posting a new notice
interface PostNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPost: (noticeText: string) => Promise<void>;
    className: string;
}

const PostNoticeModal: React.FC<PostNoticeModalProps> = ({ isOpen, onClose, onPost, className }) => {
    const [noticeText, setNoticeText] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async () => {
        if (noticeText.trim() && !isPosting) {
            setIsPosting(true);
            try {
                await onPost(noticeText.trim());
                setNoticeText(''); // Reset for next time
                onClose(); // Close modal on success
            } catch (error) {
                console.error("Failed to post notice:", error);
            } finally {
                setIsPosting(false);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Postar Aviso para ${className}`}>
            <div className="space-y-4">
                <textarea
                    value={noticeText}
                    onChange={(e) => setNoticeText(e.target.value)}
                    rows={5}
                    placeholder="Digite seu aviso aqui..."
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    autoFocus
                />
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500 hc-button-override"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handlePost}
                        disabled={!noticeText.trim() || isPosting}
                        aria-busy={isPosting}
                        className="px-4 py-2 bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override"
                    >
                        {isPosting ? <SpinnerIcon className="h-5 w-5 text-indigo-900 dark:text-white" /> : 'Postar Aviso'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Modal for creating a new class
interface CreateClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (className: string) => Promise<void>;
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [className, setClassName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (className.trim() && !isCreating) {
            setIsCreating(true);
            try {
                await onCreate(className.trim());
                setClassName('');
                onClose();
            } catch (error) {
                console.error("Failed to create class:", error);
            } finally {
                setIsCreating(false);
            }
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setClassName('');
            setIsCreating(false);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Criar Nova Turma">
            <div className="space-y-4">
                <InputField label="Nome da Turma" required>
                    <input
                        type="text"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="Ex: História - 8º Ano B"
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        autoFocus
                    />
                </InputField>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500 hc-button-override"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!className.trim() || isCreating}
                        aria-busy={isCreating}
                        className="px-4 py-2 bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override"
                    >
                        {isCreating ? <SpinnerIcon className="h-5 w-5 text-indigo-900 dark:text-white" /> : 'Criar Turma'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


type ClassCardTab = 'overview' | 'notices' | 'activities';

const NoticeListItem: React.FC<{ notice: ClassNotice }> = React.memo(({ notice }) => (
    <div className="flex items-start space-x-4 p-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hc-border-override">
        <div className="flex-shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 p-2 rounded-full">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 12.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
        </div>
        <div>
            <p className="text-sm text-slate-700 dark:text-slate-200 hc-text-primary">{notice.text}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 hc-text-secondary">
                Postado por {notice.author} - {new Date(notice.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
        </div>
    </div>
));

interface ClassCardProps {
    classData: TeacherClass;
    onPostNoticeClick: (classData: TeacherClass) => void;
    onViewSubmissionsClick: (activity: Activity) => void;
    onDeleteModule: (classId: string, moduleId: string) => void;
    user: User | null;
    onFetchClassDetails: (classId: string) => void;
}

const ClassCard: React.FC<ClassCardProps> = React.memo(({ classData, onPostNoticeClick, onViewSubmissionsClick, onDeleteModule, user, onFetchClassDetails }) => {
    const { setCurrentPage, startEditingModule, openClass } = useNavigation();
    const [activeTab, setActiveTab] = useState<ClassCardTab>('overview');
    const [copySuccess, setCopySuccess] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    const handleCopyCode = () => {
        navigator.clipboard.writeText(classData.code).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleTabChange = (tab: ClassCardTab) => {
        setActiveTab(tab);
        // Trigger lazy loading if we switch to a tab that needs detailed data
        if (tab === 'activities' && !classData.isFullyLoaded) {
            setLoadingDetails(true);
            onFetchClassDetails(classData.id);
        }
    };

    // Stop loading indicator when data arrives
    useEffect(() => {
        if (classData.isFullyLoaded) {
            setLoadingDetails(false);
        }
    }, [classData.isFullyLoaded]);

    // Safely access arrays with fallback to empty array if undefined
    const safeNotices = classData.notices || [];
    const safeActivities = classData.activities || [];

    const tabs: { id: ClassCardTab; label: string; count: number; icon?: React.ReactNode }[] = [
        { id: 'overview', label: 'Visão Geral', count: -1 },
        { id: 'notices', label: 'Avisos', count: classData.noticeCount ?? safeNotices.length },
        { id: 'activities', label: 'Atividades', count: classData.activityCount ?? safeActivities.length },
    ];
    
    const renderTabContent = () => {
        if (loadingDetails && activeTab !== 'overview' && activeTab !== 'notices') {
             return <div className="p-8 text-center text-slate-500"><SpinnerIcon className="h-6 w-6 text-indigo-500 mx-auto mb-2"/>Carregando detalhes...</div>;
        }

        switch (activeTab) {
            case 'overview':
                return (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={() => onPostNoticeClick(classData)}
                            className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:border-slate-700 hc-button-override"
                        >
                            {ICONS.notifications}
                            <span className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Postar Aviso</span>
                        </button>
                        <button 
                            onClick={() => setCurrentPage('teacher_create_activity')}
                            className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:border-slate-700 hc-button-override">
                            {ICONS.teacher_create_module}
                            <span className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Criar Atividade</span>
                        </button>
                    </div>
                );
            case 'notices':
                return safeNotices.length > 0 ? (
                    <div className="-m-6">
                        {safeNotices.map(notice => <NoticeListItem key={notice.id} notice={notice} />)}
                    </div>
                ) : <p className="text-center text-sm text-slate-500 py-8">Nenhum aviso postado.</p>;
            case 'activities':
                return safeActivities.length > 0 ? (
                     <div className="space-y-4">
                        {safeActivities.map(activity => (
                            <div key={activity.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{activity.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {activity.submissionCount ?? activity.submissions?.length ?? 0} respostas • Prazo: {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString('pt-BR') : 'N/D'}
                                    </p>
                                </div>
                                <button onClick={() => onViewSubmissionsClick(activity)} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 hc-button-override">
                                    Ver Respostas
                                </button>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-center text-sm text-slate-500 py-8">Nenhuma atividade disponível.</p>;
            default: return null;
        }
    };

    return (
        <Card className="!p-0 overflow-hidden">
            <div className="p-6 bg-emerald-50/50 dark:bg-emerald-500/10">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{classData.name}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600 dark:text-slate-300 hc-text-secondary">
                            <div className="flex items-center space-x-2 bg-slate-200/70 dark:bg-slate-700 rounded-full px-2 py-0.5">
                                <span className="font-mono text-xs">{classData.code}</span>
                                <button onClick={handleCopyCode} title="Copiar código" aria-label="Copiar código da turma">
                                    {copySuccess ? 
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        : ICONS.copy}
                                </button>
                                <span aria-live="polite" className="sr-only">
                                    {copySuccess ? "Código copiado com sucesso!" : ""}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => openClass(classData)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 shadow-sm transition-colors hc-button-override"
                    >
                        Abrir Turma / Chamada
                    </button>
                </div>
            </div>

            <div className="px-6 bg-slate-100/60 dark:bg-slate-700/30 border-y border-slate-200 dark:border-slate-700 hc-bg-override hc-border-override">
                <nav className="flex space-x-4 overflow-x-auto -mb-px" role="tablist" aria-label={`Gerenciar turma ${classData.name}`}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            id={`tab-${classData.id}-${tab.id}`}
                            onClick={() => handleTabChange(tab.id)}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`tabpanel-${classData.id}-${tab.id}`}
                            className={`flex items-center space-x-2 flex-shrink-0 py-3 px-1 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                activeTab === tab.id
                                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            } hc-link-override`}
                        >
                            {tab.icon && <div className="h-5 w-5">{tab.icon}</div>}
                            <span>{tab.label}</span>
                            {tab.count > 0 && <span className="text-xs bg-slate-200 dark:bg-slate-600 rounded-full px-2 py-0.5">{tab.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-6">
                {renderTabContent()}
            </div>
        </Card>
    );
});

const TeacherDashboard: React.FC = () => {
    // Consumindo múltiplos contextos (Separação de responsabilidades)
    const { teacherClasses, fetchTeacherClasses, handleCreateClass, fetchClassDetails, isLoadingClasses } = useTeacherClassContext();
    const { fetchModulesLibrary, handleDeleteModule, handleGradeActivity, isLoadingContent } = useTeacherAcademicContext();
    const { pendingInvitations, handleAcceptInvite, handleDeclineInvite, handlePostNotice, isSubmittingComm, isLoadingComm } = useTeacherCommunicationContext();
    const { user } = useAuth();
    
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const [selectedClassForNotice, setSelectedClassForNotice] = useState<TeacherClass | null>(null);
    const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
    const [activityForSubmissions, setActivityForSubmissions] = useState<Activity | null>(null);
    const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);

    // Aggregated loading state
    const isLoading = isLoadingClasses || isLoadingContent || isLoadingComm;

    // Ensure global modules are loaded so we can filter them for each class
    useEffect(() => {
        fetchModulesLibrary();
    }, [fetchModulesLibrary]);

    const handleFetchAll = () => {
        // Trigger updates across all contexts
        fetchTeacherClasses(true);
    };

    const handlePostNoticeClick = useCallback((classData: TeacherClass) => {
        setSelectedClassForNotice(classData);
        setIsNoticeModalOpen(true);
    }, []);

    const handleViewSubmissionsClick = useCallback((activity: Activity) => {
        setActivityForSubmissions(activity);
        setIsSubmissionsModalOpen(true);
    }, []);
    
    const onPostNoticeWrapper = async (noticeText: string) => {
        if (!selectedClassForNotice) return;
        await handlePostNotice(selectedClassForNotice.id, noticeText);
    };
    
    return (
        <div className="space-y-8">
            <div className="flex justify-end items-center gap-3">
                <button 
                    onClick={handleFetchAll}
                    className="flex items-center justify-center px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg shadow-sm hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override"
                    disabled={isLoading}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-1 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span>Sincronizar</span>
                </button>
                <button 
                    onClick={() => setIsCreateClassModalOpen(true)}
                    className="flex items-center justify-center px-4 py-2 bg-blue-200 text-blue-900 font-semibold rounded-lg shadow-sm hover:bg-blue-300 transition-colors dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override">
                    <div className="h-5 w-5 mr-2">{ICONS.plus}</div>
                    <span>Nova Turma</span>
                </button>
            </div>

            {/* Pending Invitations Section */}
            {pendingInvitations && pendingInvitations.length > 0 && (
                <div className="space-y-4 animate-fade-in">
                    {pendingInvitations.map(invite => (
                        <PendingInviteCard 
                            key={invite.id} 
                            invitation={invite} 
                            onAccept={() => handleAcceptInvite(invite)}
                            onDecline={() => handleDeclineInvite(invite.id)}
                            isProcessing={isSubmittingComm}
                        />
                    ))}
                </div>
            )}
            
            <div className="space-y-6">
                {teacherClasses.map(c => {
                    return (
                        <ClassCard 
                            key={c.id} 
                            classData={c}
                            user={user}
                            onPostNoticeClick={handlePostNoticeClick}
                            onViewSubmissionsClick={handleViewSubmissionsClick}
                            onDeleteModule={handleDeleteModule}
                            onFetchClassDetails={fetchClassDetails}
                        />
                    );
                })}
            </div>

            <Card className="bg-blue-50/50 dark:bg-blue-500/10">
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">Como funciona</h2>
                 <div className="grid md:grid-cols-3 gap-6">
                    <div className="flex items-start space-x-4">
                        <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 bg-blue-200 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 font-bold rounded-full">1</span>
                        <div>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Crie uma turma</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">Defina nome e descrição da turma</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-4">
                        <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 bg-blue-200 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 font-bold rounded-full">2</span>
                        <div>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Compartilhe o código</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">Alunos usam o código para entrar na turma</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-4">
                        <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 bg-blue-200 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 font-bold rounded-full">3</span>
                        <div>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Adicione conteúdo</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">Publique módulos e atividades para seus alunos</p>
                        </div>
                    </div>
                 </div>
            </Card>

            {selectedClassForNotice && (
                <PostNoticeModal
                    isOpen={isNoticeModalOpen}
                    onClose={() => setIsNoticeModalOpen(false)}
                    onPost={onPostNoticeWrapper}
                    className={selectedClassForNotice.name}
                />
            )}
            
             {activityForSubmissions && (
                <SubmissionsModal
                    isOpen={isSubmissionsModalOpen}
                    onClose={() => {
                        setIsSubmissionsModalOpen(false);
                        setActivityForSubmissions(null);
                    }}
                    activity={activityForSubmissions}
                    onGradeActivity={handleGradeActivity}
                />
            )}
            
            <CreateClassModal
                isOpen={isCreateClassModalOpen}
                onClose={() => setIsCreateClassModalOpen(false)}
                onCreate={handleCreateClass}
            />
        </div>
    );
};

export default TeacherDashboard;
