
import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useTeacherContent } from '../hooks/teacher/useTeacherContent';
import { useTeacherClassContext } from './TeacherClassContext';
import type { Module, Activity, PendingActivity } from '../types';

export interface TeacherAcademicContextType {
    modules: Module[];
    draftActivities: Activity[];
    draftModules: Module[];
    isLoadingContent: boolean;
    isSubmittingContent: boolean;
    allPendingActivities: PendingActivity[];
    dashboardStats: {
        totalClasses: number;
        totalStudents: number;
        totalModulesCreated: number;
        totalPendingSubmissions: number;
    };
    fetchTeacherContent: (forceRefresh?: boolean) => Promise<void>;
    fetchModulesLibrary: () => Promise<void>;
    handleSaveActivity: (activity: Omit<Activity, 'id'>, isDraft?: boolean) => Promise<boolean>;
    handleUpdateActivity: (activityId: string, activityData: Partial<Activity>, isDraft?: boolean) => Promise<boolean>;
    handleGradeActivity: (activityId: string, studentId: string, grade: number, feedback: string, scores?: Record<string, number>) => Promise<boolean>;
    handleDeleteActivity: (activityId: string) => Promise<void>;
    handleDeleteModule: (classId: string, moduleId: string) => void;
    handleSaveModule: (module: Omit<Module, 'id'>, isDraft?: boolean) => Promise<boolean>;
    handleUpdateModule: (module: Module, isDraft?: boolean) => Promise<void>;
    handlePublishModuleDraft: (moduleId: string, classIds: string[]) => Promise<boolean>;
    handlePublishDraft: (activityId: string, updateData: { classId: string, className: string, dueDate: string, points: number }) => Promise<boolean>;
    handleModuleProgressUpdate: (moduleId: string, progress: number) => Promise<void>;
    handleModuleComplete: (moduleId: string) => Promise<void>;
}

export const TeacherAcademicContext = createContext<TeacherAcademicContextType | undefined>(undefined);

export function TeacherAcademicProvider({ children }: { children?: React.ReactNode }) {
    const { user } = useAuth();
    const { addToast } = useToast();
    
    // Consome dados de turmas para passar ao hook de conteúdo (necessário para atualizações otimistas)
    const { teacherClasses, setTeacherClasses } = useTeacherClassContext();

    const contentData = useTeacherContent(user, addToast, setTeacherClasses, teacherClasses);

    // --- Computed Properties ---

    const dashboardStats = useMemo(() => {
        const myModulesCount = contentData.modules.filter(m => m.creatorId === user?.id).length;
        return {
            totalClasses: teacherClasses.length,
            totalStudents: teacherClasses.reduce((acc, c) => acc + (c.studentCount || (c.students || []).length || 0), 0),
            totalModulesCreated: myModulesCount,
            totalPendingSubmissions: contentData.pendingActivitiesList.reduce((acc, a) => acc + a.pendingCount, 0)
        };
    }, [teacherClasses, contentData.modules, contentData.pendingActivitiesList, user?.id]);

    // --- Legacy/Future Placeholders ---
    const handleModuleProgressUpdate = async () => {};
    const handleModuleComplete = async () => {};
    
    const value = {
        ...contentData,
        allPendingActivities: contentData.pendingActivitiesList, // Use list directly from hook
        dashboardStats,
        handleModuleProgressUpdate,
        handleModuleComplete
    };

    return (
        <TeacherAcademicContext.Provider value={value}>
            {children}
        </TeacherAcademicContext.Provider>
    );
}

export const useTeacherAcademicContext = () => {
    const context = useContext(TeacherAcademicContext);
    if (context === undefined) {
        throw new Error('useTeacherAcademicContext must be used within a TeacherAcademicProvider');
    }
    return context;
};