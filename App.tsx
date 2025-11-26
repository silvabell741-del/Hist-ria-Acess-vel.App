
import React, { lazy, Suspense, useContext, useEffect, useState, useRef } from 'react';
import type { Page, Role, User } from './types';
import { LoginPage } from './components/LoginPage';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { YearSelectionPage } from './components/YearSelectionPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Card } from './components/common/Card';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { SyncProvider } from './contexts/SyncContext'; // Added Import
// Novos Providers
import { StudentAcademicProvider } from './contexts/StudentAcademicContext';
import { StudentGamificationProvider } from './contexts/StudentGamificationContext';
import { StudentNotificationProvider } from './contexts/StudentNotificationContext';

// Novos Providers de Professor (Refatoração Fase 3)
import { TeacherClassProvider } from './contexts/TeacherClassContext';
import { TeacherAcademicProvider } from './contexts/TeacherAcademicContext';
import { TeacherCommunicationProvider } from './contexts/TeacherCommunicationContext';

import { AdminDataProvider, AdminDataContext } from './contexts/AdminDataContext';
import { ToastProvider } from './contexts/ToastContext';

// Lazy-loaded page components
const Modules = lazy(() => import('./components/Modules'));
const Quizzes = lazy(() => import('./components/Quizzes'));
const Activities = lazy(() => import('./components/Activities'));
const StudentActivityResponse = lazy(() => import('./components/StudentActivityResponse'));
const Achievements = lazy(() => import('./components/Achievements'));
const JoinClass = lazy(() => import('./components/JoinClass'));
const Profile = lazy(() => import('./components/Profile'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const ModuleViewPage = lazy(() => import('./components/ModuleViewPage'));
const Boletim = lazy(() => import('./components/Boletim'));
// Teacher Components
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const ModuleCreator = lazy(() => import('./components/ModuleCreator'));
const CreateActivity = lazy(() => import('./components/CreateActivity'));
const TeacherStatistics = lazy(() => import('./components/TeacherStatistics'));
const PendingActivities = lazy(() => import('./components/PendingActivities'));
const TeacherGradingView = lazy(() => import('./components/TeacherGradingView'));
const SchoolRecords = lazy(() => import('./components/SchoolRecords'));
const ClassView = lazy(() => import('./components/ClassView'));
const TeacherRepository = lazy(() => import('./components/TeacherRepository'));
const TeacherModuleRepository = lazy(() => import('./components/TeacherModuleRepository'));
// Admin Components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminManageUsers = lazy(() => import('./components/AdminManageUsers'));
const AdminManageModules = lazy(() => import('./components/AdminManageModules'));
const AdminManageQuizzes = lazy(() => import('./components/AdminManageQuizzes'));
const AdminManageAchievements = lazy(() => import('./components/AdminManageAchievements'));
const AdminStats = lazy(() => import('./components/AdminStats'));
const AdminTests = lazy(() => import('./components/AdminTests'));
const CreateAchievement = lazy(() => import('./components/CreateAchievement'));
const AdminCreateModule = lazy(() => import('./components/AdminCreateModule'));
const AdminCreateQuiz = lazy(() => import('./components/AdminCreateQuiz'));


const PAGE_TITLES: Record<Exclude<Page, 'module_view' | 'student_activity_view' | 'class_view' | 'teacher_create_module' | 'teacher_create_activity' | 'admin_create_quiz' | 'admin_create_achievement' | 'teacher_pending_activities' | 'admin_create_module' | 'teacher_grading_view' | 'dashboard' | 'teacher_main_dashboard'>, string> = {
    modules: 'Módulos',
    quizzes: 'Quizzes',
    activities: 'Atividades',
    achievements: 'Conquistas',
    join_class: 'Turmas',
    profile: 'Meu Perfil',
    notifications: 'Notificações',
    boletim: 'Boletim',
    teacher_dashboard: 'Minhas Turmas',
    teacher_statistics: 'Estatísticas do Professor',
    teacher_school_records: 'Histórico Escolar',
    teacher_repository: 'Banco de Questões',
    teacher_module_repository: 'Banco de Módulos',
    admin_dashboard: 'Painel do Administrador',
    admin_users: 'Gerenciar Usuários',
    admin_modules: 'Gerenciar Módulos',
    admin_quizzes: 'Gerenciar Quizzes',
    admin_achievements: 'Gerenciar Conquistas',
    admin_stats: 'Estatísticas da Plataforma',
    admin_tests: 'Painel de Testes',
};

const LoadingSpinner: React.FC = () => (
    <div role="status" className="flex justify-center items-center h-full pt-16">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="sr-only">Carregando conteúdo...</span>
    </div>
);

const useKeyboardShortcuts = () => {
    const { userRole } = useAuth();
    const { setCurrentPage } = useNavigation();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                return;
            }

            if (event.altKey) {
                const key = event.key.toLowerCase();
                let targetPage: Page | null = null;
                
                if (userRole === 'aluno') {
                    switch(key) {
                        case 'm': targetPage = 'modules'; break;
                        case 'q': targetPage = 'quizzes'; break;
                        case 'a': targetPage = 'activities'; break;
                        case 'c': targetPage = 'achievements'; break;
                        case 't': targetPage = 'join_class'; break;
                        case 'p': targetPage = 'profile'; break;
                        case 'n': targetPage = 'notifications'; break;
                        case 'b': targetPage = 'boletim'; break;
                    }
                } else if (userRole === 'professor') {
                     switch(key) {
                        case 'm': targetPage = 'teacher_dashboard'; break;
                        case 'i': targetPage = 'teacher_pending_activities'; break;
                        case 'b': targetPage = 'modules'; break;
                        case 'c': targetPage = 'teacher_create_module'; break;
                        case 'a': targetPage = 'teacher_create_activity'; break;
                        case 'e': targetPage = 'teacher_statistics'; break;
                        case 'h': targetPage = 'teacher_school_records'; break;
                        case 'p': targetPage = 'profile'; break;
                        case 'n': targetPage = 'notifications'; break;
                        case 'r': targetPage = 'teacher_repository'; break;
                    }
                } else if (userRole === 'admin') {
                     switch(key) {
                        case 'd': targetPage = 'admin_dashboard'; break;
                        case 'u': targetPage = 'admin_users'; break; 
                        case 'm': targetPage = 'admin_modules'; break; 
                        case 'q': targetPage = 'admin_quizzes'; break; 
                        case 'c': targetPage = 'admin_achievements'; break;
                        case 'e': targetPage = 'admin_stats'; break;
                        case 't': targetPage = 'admin_tests'; break;
                        case 'p': targetPage = 'profile'; break;
                    }
                }

                if (targetPage) {
                    event.preventDefault();
                    setCurrentPage(targetPage);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [userRole, setCurrentPage]);
};


const MainLayout: React.FC = () => {
    useKeyboardShortcuts();
    const { userRole } = useAuth();
    const { currentPage, activeModule, activeClass, activeActivity, gradingActivity, editingModule, editingQuiz, editingAchievement, setCurrentPage, toggleMobileMenu } = useNavigation();
    
    const [isScrolled, setIsScrolled] = useState(false);
    const mainContentRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const mainEl = mainContentRef.current;
        if (!mainEl) return;

        const handleScroll = () => {
            setIsScrolled(mainEl.scrollTop > 20);
        };

        mainEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            mainEl.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTop = 0;
        }
        const heading = document.getElementById('page-main-heading');
        if (heading) {
            heading.focus({ preventScroll: true });
        }
    }, [currentPage]);


    const renderPage = () => {
        if (userRole === 'admin') {
            switch (currentPage) {
                case 'admin_dashboard': return <AdminDashboard />;
                case 'admin_users': return <AdminManageUsers />;
                case 'admin_modules': return <AdminManageModules />;
                case 'admin_quizzes': return <AdminManageQuizzes />;
                case 'admin_achievements': return <AdminManageAchievements />;
                case 'admin_stats': return <AdminStats />;
                case 'admin_tests': return <AdminTests />;
                case 'teacher_create_module': return <ModuleCreator />; 
                case 'admin_create_module': return <AdminCreateModule />;
                case 'admin_create_quiz': return <AdminCreateQuiz />;
                case 'admin_create_achievement': return <CreateAchievement />;
                case 'profile': return <Profile />;
                default: return <AdminDashboard />;
            }
        }

        if (userRole === 'professor') {
            switch (currentPage) {
                case 'teacher_dashboard': return <TeacherDashboard />;
                case 'teacher_pending_activities': return <PendingActivities />;
                case 'modules': return <Modules />;
                case 'teacher_create_module': return <ModuleCreator />;
                case 'teacher_create_activity': return <CreateActivity />;
                case 'teacher_repository': return <TeacherRepository />;
                case 'teacher_module_repository': return <TeacherModuleRepository />;
                case 'teacher_statistics': return <TeacherStatistics />;
                case 'teacher_school_records': return <SchoolRecords />;
                case 'class_view': return <ClassView />;
                case 'teacher_grading_view':
                    return gradingActivity ? <TeacherGradingView /> : <PendingActivities />;
                case 'profile': return <Profile />;
                case 'notifications':
                    return <TeacherDashboard />;
                case 'module_view':
                    return activeModule ? <ModuleViewPage /> : <Modules />;
                default:
                     return <TeacherDashboard />;
            }
        }
        
        switch (currentPage) {
            case 'modules': return <Modules />;
            case 'quizzes': return <Quizzes />;
            case 'activities': return <Activities />;
            case 'achievements': return <Achievements />;
            case 'join_class': return <JoinClass />;
            case 'profile': return <Profile />;
            case 'notifications': return <NotificationsPage />;
            case 'boletim': return <Boletim />;
            case 'module_view':
                return activeModule ? <ModuleViewPage /> : <Modules />;
            case 'student_activity_view':
                return activeActivity ? <StudentActivityResponse /> : <Activities />;
            case 'dashboard': return <Modules />;
            default: return <Modules />;
        }
    };
    
    const pageTitle = currentPage === 'module_view' ? activeModule?.title ?? 'Módulo' 
                    : currentPage === 'class_view' ? activeClass?.name ?? 'Turma'
                    : currentPage === 'student_activity_view' ? activeActivity?.title ?? 'Responder Atividade'
                    : currentPage === 'teacher_grading_view' ? (gradingActivity ? `Corrigindo: ${gradingActivity.title}` : 'Correção')
                    : currentPage === 'teacher_create_module' ? (editingModule ? 'Editar Módulo' : 'Criar Módulo')
                    : currentPage === 'admin_create_module' ? (editingModule ? 'Editar Módulo (Admin)' : 'Criar Módulo (Admin)')
                    : currentPage === 'teacher_create_activity' ? 'Criar Atividade'
                    : currentPage === 'admin_create_quiz' ? (editingQuiz ? 'Editar Quiz (Admin)' : 'Criar Quiz (Admin)')
                    : currentPage === 'admin_create_achievement' ? (editingAchievement ? 'Editar Conquista' : 'Criar Conquista')
                    : currentPage === 'teacher_pending_activities' ? 'Pendências de Correção'
                    : PAGE_TITLES[currentPage as Exclude<Page, 'module_view' | 'student_activity_view' | 'class_view' | 'teacher_create_module' | 'teacher_create_activity' | 'admin_create_quiz' | 'admin_create_achievement' | 'teacher_pending_activities' | 'admin_create_module' | 'teacher_grading_view' | 'dashboard' | 'teacher_main_dashboard'>] || 'História Acessível';

    useEffect(() => {
        document.title = `${pageTitle} - História Acessível`;
    }, [pageTitle]);

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 hc-bg-override">
            <OfflineIndicator />
            <a 
                href="#main-content" 
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-indigo-600 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
                Pular para o conteúdo principal
            </a>

            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <button
                    onClick={toggleMobileMenu}
                    className="lg:hidden fixed top-3 left-3 z-40 p-2 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-slate-600 dark:text-slate-300 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 hc-bg-override hc-button-override"
                    aria-label="Abrir menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <Header title={pageTitle} isScrolled={isScrolled} />
                <main 
                    id="main-content" 
                    ref={mainContentRef} 
                    className="flex-1 overflow-y-auto py-6 sm:py-8 lg:py-10 px-3 sm:px-4 lg:px-6 relative" 
                    tabIndex={-1}
                    aria-label="Conteúdo principal"
                >
                    <Suspense fallback={<LoadingSpinner />}>
                        <div className="h-full w-full">
                            {renderPage()}
                        </div>
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

const AppContent = () => {
    const { authState, user, userRole, createUserProfile, authError } = useAuth();
    const [onboardingStep, setOnboardingStep] = useState<'role' | 'year'>('role');
    const [selectedRoleForOnboarding, setSelectedRoleForOnboarding] = useState<Role | null>(null);
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

    if (authState === 'loading') {
        return <LoadingSpinner />;
    }
    
    if (authState === 'unauthenticated') {
        return (
            <>
                <OfflineIndicator />
                <LoginPage initialError={authError} />
            </>
        );
    }
    
    if (user && !user.role) {
        const handleProfileCreationError = (error: any) => {
            const detailedMessage = `Erro do Firebase: ${error.message}.`;
            let likelyCause = `Causa provável: As Regras de Segurança (Security Rules) do seu Firestore estão impedindo a criação de novos perfis.`;
            if (error.code === 'permission-denied') {
                likelyCause = `Causa provável: Permissão negada. As Regras de Segurança (Security Rules) do seu Firestore não permitem que um novo usuário crie seu próprio perfil.`;
            }
            const solution = `Solução: Vá para o console do Firebase -> Firestore Database -> Aba "Regras" e garanta que a regra para a coleção "users" permita a criação de documentos por usuários autenticados.`;
            setOnboardingError(`${detailedMessage}\n\n${likelyCause}\n\n${solution}`);
        };

        switch (onboardingStep) {
            case 'role':
                return <RoleSelectionPage error={onboardingError} onRoleSelected={async (role) => {
                    setOnboardingError(null);
                    try {
                        if (role === 'aluno') {
                            setSelectedRoleForOnboarding('aluno');
                            setOnboardingStep('year');
                        } else {
                            await createUserProfile(role, undefined);
                        }
                    } catch (error) {
                        handleProfileCreationError(error);
                    }
                }} />;
            case 'year':
                return <YearSelectionPage error={onboardingError} onYearSelected={async (year) => {
                    setOnboardingError(null);
                    if (selectedRoleForOnboarding) {
                        try {
                            await createUserProfile(selectedRoleForOnboarding, year);
                        } catch (error) {
                            handleProfileCreationError(error);
                        }
                    }
                }} />;
            default:
                return <RoleSelectionPage error={onboardingError} onRoleSelected={async (role) => {
                    setOnboardingError(null);
                    try {
                       await createUserProfile(role, undefined);
                    } catch(error) {
                        handleProfileCreationError(error);
                    }
                }} />;
        }
    }

    if (user && user.role) {
         return (
            <NavigationProvider>
                <SyncProvider>
                    {userRole === 'aluno' ? (
                        <StudentAcademicProvider>
                            <StudentNotificationProvider>
                                <StudentGamificationProvider>
                                    <MainLayout />
                                </StudentGamificationProvider>
                            </StudentNotificationProvider>
                        </StudentAcademicProvider>
                    ) : userRole === 'professor' ? (
                        <TeacherClassProvider>
                            <TeacherAcademicProvider>
                                <TeacherCommunicationProvider>
                                    <MainLayout />
                                </TeacherCommunicationProvider>
                            </TeacherAcademicProvider>
                        </TeacherClassProvider>
                    ) : (
                        <AdminDataProvider>
                            <MainLayout />
                        </AdminDataProvider>
                    )}
                </SyncProvider>
            </NavigationProvider>
        );
    }
    
    return <LoadingSpinner />;
};


const App = () => {
    return (
        <SettingsProvider>
            <AuthProvider>
                <ToastProvider>
                    <AppContent />
                </ToastProvider>
            </AuthProvider>
        </SettingsProvider>
    );
};

export default App;
