
import React from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';

const WelcomeBanner: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="p-8 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg hc-bg-override hc-border-override">
            <p className="text-lg opacity-90 hc-text-override">Olá, {user?.name || 'Admin'}! Gerencie o conteúdo público da plataforma.</p>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode; value: string | number; label: string; iconBgColor: string }> = ({ icon, value, label, iconBgColor }) => (
    <Card className="flex items-center p-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="font-bold text-slate-800 dark:text-slate-100 hc-text-primary text-2xl">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">{label}</p>
        </div>
    </Card>
);

const QuickActionButton: React.FC<{ label: string; onClick: () => void, isPrimary?: boolean }> = ({ label, onClick, isPrimary = false }) => (
    <button
        onClick={onClick}
        className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            isPrimary 
            ? 'bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30 dark:hover:bg-orange-500/40' 
            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600'
        } hc-button-override`}
    >
        {label}
    </button>
);

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />
);


const AdminDashboard: React.FC = () => {
    // FIX: Use totalModulesCount from context which is the real server count, 
    // instead of modules.length which is just the paginated loaded amount.
    const { totalModulesCount, quizzes, achievements, isLoading } = useAdminData();
    const { setCurrentPage } = useNavigation();

    return (
        <div className="space-y-8">
            <WelcomeBanner />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {isLoading ? (
                    <>
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                    </>
                ) : (
                    <>
                        <StatCard icon={ICONS.modules} value={totalModulesCount} label="Módulos Públicos" iconBgColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
                        <StatCard icon={ICONS.quizzes} value={quizzes.length} label="Quizzes Criados" iconBgColor="bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-300" />
                        <StatCard icon={ICONS.achievements} value={achievements.length} label="Conquistas Ativas" iconBgColor="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300" />
                    </>
                )}
            </div>
            
            <Card>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center hc-text-primary">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    Gerenciamento de Conteúdo
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                   <QuickActionButton label="Gerenciar Módulos" onClick={() => setCurrentPage('admin_modules')} />
                   <QuickActionButton label="Gerenciar Quizzes" onClick={() => setCurrentPage('admin_quizzes')} />
                   <QuickActionButton label="Gerenciar Conquistas" onClick={() => setCurrentPage('admin_achievements')} />
                   <QuickActionButton label="Executar Testes" onClick={() => setCurrentPage('admin_tests')} isPrimary />
                </div>
            </Card>

        </div>
    );
};

export default AdminDashboard;
