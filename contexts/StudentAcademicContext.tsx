
import React, { createContext, useContext, useMemo } from 'react';
import type { Module, Quiz, Activity, TeacherClass, GradeReport, ClassGradeReport, Unidade } from '../types';
import { useAuth } from './AuthContext';
import { useStudentContent } from '../hooks/useStudentContent';
import { useStudentReport } from '../hooks/useStudentReport';
import { QueryDocumentSnapshot } from 'firebase/firestore';

interface ModuleFilters {
    queryText: string;
    serie: string;
    materia: string;
    status: string;
    scope: 'my_modules' | 'public';
}

interface StudentAcademicContextType {
    // Dados Principais
    inProgressModules: Module[];
    searchedModules: Module[];
    searchedQuizzes: Quiz[];
    studentClasses: TeacherClass[];
    gradeReport: GradeReport;
    
    // Filtros Persistidos
    moduleFilters: ModuleFilters;
    
    // Flags
    isLoading: boolean;
    isSearchingModules: boolean;
    isSearchingQuizzes: boolean;

    // Actions
    refreshContent: (forceRefresh?: boolean) => Promise<void>;
    searchModules: (filters: { 
        queryText?: string; 
        serie?: string; 
        materia?: string; 
        status?: 'Não iniciado' | 'Concluído' | 'Em andamento' | 'all';
        scope: 'my_modules' | 'public';
    }) => Promise<void>;
    searchQuizzes: (filters: { serie?: string; materia?: string; status?: 'feito' | 'nao_iniciado' | 'all' }) => Promise<void>;
    
    // Activities (Legacy/Paginated)
    searchActivities: (
        filters: { classId: string; materia: string; unidade: string }, 
        lastDoc?: QueryDocumentSnapshot | null
    ) => Promise<{ activities: Activity[], lastDoc: QueryDocumentSnapshot | null }>;
    
    handleActivitySubmit: (activityId: string, content: string) => Promise<void>;
    handleJoinClass: (code: string) => Promise<boolean>;
    handleLeaveClass: (classId: string) => void;
    handleModuleProgressUpdate: (moduleId: string, progress: number) => Promise<void>;
    handleModuleComplete: (moduleId: string) => Promise<void>;
}

export const StudentAcademicContext = createContext<StudentAcademicContextType | undefined>(undefined);

export function StudentAcademicProvider({ children }: { children?: React.ReactNode }) {
    const { user } = useAuth();
    
    // Hook principal de conteúdo (Módulos, Quizzes, Atividades Paginadas)
    const content = useStudentContent(user);
    
    // Novo Hook dedicado ao Boletim (Calcula todas as notas das turmas)
    const { gradeReport, isLoadingReport } = useStudentReport(user, content.studentClasses);

    const value = {
        ...content,
        gradeReport,
        // Combina o loading geral com o loading do relatório para evitar que a UI renderize 
        // o componente de Boletim vazio antes das notas serem processadas.
        isLoading: content.isLoading || isLoadingReport
    };

    return (
        <StudentAcademicContext.Provider value={value}>
            {children}
        </StudentAcademicContext.Provider>
    );
}

export const useStudentAcademic = () => {
    const context = useContext(StudentAcademicContext);
    if (context === undefined) {
        throw new Error('useStudentAcademic must be used within a StudentAcademicProvider');
    }
    return context;
};
