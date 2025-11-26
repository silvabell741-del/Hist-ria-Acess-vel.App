// FILE: components/Sidebar.tsx
import React from 'react';
import type { Page } from '../types';
import { Logo, ICONS } from '../constants/index';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudentNotificationsContext } from '../contexts/StudentNotificationContext';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';

const studentNavItems: { id: Page, label: string }[] = [
    { id: 'modules', label: 'Módulos' },
    { id: 'quizzes', label: 'Quizzes' },
    { id: 'activities', label: 'Atividades' },
    { id: 'achievements', label: 'Conquistas' },
    { id: 'boletim', label: 'Boletim' },
    { id: 'join_class', label: 'Turmas' },
];

const teacherNavItems: { id: Page, label: string }[] = [
    { id: 'teacher_dashboard', label: 'Minhas Turmas' },
    { id: 'teacher_pending_activities', label: 'Pendências' },
    { id: 'modules', label: 'Módulos' },
    { id: 'teacher_module_repository', label: 'Banco de Módulos' }, 
    { id: 'teacher_repository', label: 'Banco de Questões' },
    { id: 'teacher_statistics', label: 'Estatísticas' },
    { id: 'teacher_school_records', label: 'Histórico Escolar' },
];

const adminNavItems: { id: Page, label: string }[] = [
    { id: 'admin_dashboard', label: 'Dashboard' },
    { id: 'admin_modules', label: 'Gerenciar Módulos' },
    { id: 'admin_quizzes', label: 'Gerenciar Quizzes' },
    { id: 'admin_achievements', label: 'Gerenciar Conquistas' },
    { id: 'admin_stats', label: 'Estatísticas' },
    { id: 'admin_tests', label: 'Testes' },
];

const iconMap: { [key in Page]?: React.ReactNode } = {
    // Student
    modules: ICONS['modules'],
    quizzes: ICONS['quizzes'],
    activities: ICONS['activities'],
    achievements: ICONS['achievements'],
    boletim: ICONS['boletim'],
    join_class: ICONS['join_class'],
    // Teacher
    teacher_dashboard: ICONS['teacher_dashboard'],
    teacher_pending_activities: ICONS['teacher_pending_activities'],
    teacher_create_module: ICONS['teacher_create_module'],
    teacher_create_activity: ICONS['teacher_create_activity'],
    teacher_statistics: ICONS['teacher_statistics'],
    teacher_school_records: ICONS['teacher_school_records'],
    teacher_repository: ICONS['repository'],
    teacher_module_repository: ICONS['modules'], // Using modules icon for now
    // Admin
    admin_dashboard: ICONS['dashboard'],
    admin_users: ICONS['admin_users'],
    admin_modules: ICONS['modules'],
    admin_quizzes: ICONS['quizzes'],
    admin_achievements: ICONS['achievements'],
    admin_stats: ICONS['teacher_statistics'], // Re-using icon
    admin_tests: ICONS['admin_tests'],
}

// --- Helper Components to safely use hooks ---

const StudentNotificationBadge: React.FC = () => {
    const { unreadNotificationCount } = useStudentNotificationsContext();
    if (unreadNotificationCount <= 0) return null;
    return (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" aria-label={`${unreadNotificationCount} novas notificações`}>
            {unreadNotificationCount}
        </span>
    );
};

const TeacherPendingBadge: React.FC = () => {
    const { dashboardStats } = useTeacherAcademicContext();
    const pendingCount = dashboardStats.totalPendingSubmissions;
    if (pendingCount <= 0) return null;
    return (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" aria-label={`${pendingCount} pendentes`}>
            {pendingCount}
        </span>
    );
};

export const Sidebar: React.FC = () => {
    const { currentPage, setCurrentPage, isMobileMenuOpen, toggleMobileMenu } = useNavigation();
    const { handleLogout: onLogout, userRole } = useAuth();
    
    const navItems = userRole === 'admin' ? adminNavItems 
                   : userRole === 'professor' ? teacherNavItems 
                   : studentNavItems;

    const showProfileLink = true;
    const showNotificationsLink = userRole === 'aluno';
    
    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/60 z-20 lg:hidden transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={toggleMobileMenu}
                aria-hidden="true"
            ></div>

            <aside className={`w-64 bg-blue-950 text-slate-200 flex flex-col h-full border-r border-blue-900 dark:bg-slate-900 dark:border-slate-800 hc-bg-override hc-border-override fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b border-blue-900 dark:border-slate-800 hc-border-override">
                    <Logo />
                </div>
                <nav className="flex-1 px-4 py-5 space-y-2" aria-label="Navegação Principal">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id)}
                            aria-current={currentPage === item.id ? 'page' : undefined}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors duration-200 text-left ${
                                currentPage === item.id ? 'bg-blue-800 text-white font-semibold dark:bg-indigo-500' : 'hover:bg-blue-900 dark:hover:bg-white/10'
                            } hc-link-override`}
                        >
                            <div className="flex items-center space-x-3">
                                <span aria-hidden="true">{iconMap[item.id]}</span>
                                <span>{item.label}</span>
                            </div>
                            {item.id === 'teacher_pending_activities' && userRole === 'professor' && (
                                <TeacherPendingBadge />
                            )}
                        </button>
                    ))}
                </nav>
                <div className="px-4 py-5 border-t border-blue-900 dark:border-slate-800 space-y-2 hc-border-override">
                     {showNotificationsLink && (
                        <button
                            onClick={() => setCurrentPage('notifications')}
                            aria-current={currentPage === 'notifications' ? 'page' : undefined}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors duration-200 text-left ${
                                currentPage === 'notifications' ? 'bg-blue-800 text-white font-semibold dark:bg-indigo-500' : 'hover:bg-blue-900 dark:hover:bg-white/10'
                            } hc-link-override`}
                        >
                            <div className="flex items-center space-x-3">
                                <span aria-hidden="true">{ICONS['notifications']}</span>
                                <span>Notificações</span>
                            </div>
                            <StudentNotificationBadge />
                        </button>
                     )}
                     {showProfileLink && (
                         <button
                            onClick={() => setCurrentPage('profile')}
                            aria-current={currentPage === 'profile' ? 'page' : undefined}
                            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-left ${
                                currentPage === 'profile' ? 'bg-blue-800 text-white font-semibold dark:bg-indigo-500' : 'hover:bg-blue-900 dark:hover:bg-white/10'
                            } hc-link-override`}
                        >
                            <span aria-hidden="true">{ICONS.profile}</span>
                            <span>Perfil</span>
                        </button>
                     )}
                    <button onClick={onLogout} className="flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 w-full text-left hover:bg-blue-900 dark:hover:bg-white/10 hc-link-override">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span>Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
};