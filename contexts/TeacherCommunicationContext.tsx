
import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useTeacherCommunication } from '../hooks/teacher/useTeacherCommunication';
import { useTeacherClassContext } from './TeacherClassContext';
import type { ClassInvitation } from '../types';

export interface TeacherCommunicationContextType {
    pendingInvitations: ClassInvitation[];
    isLoadingComm: boolean;
    isSubmittingComm: boolean;
    fetchTeacherCommunication: (forceRefresh?: boolean) => Promise<void>;
    handlePostNotice: (classId: string, text: string) => Promise<void>;
    handleInviteTeacher: (classId: string, email: string, subject: string) => Promise<void>;
    handleAcceptInvite: (invitation: ClassInvitation) => Promise<void>;
    handleDeclineInvite: (invitationId: string) => Promise<void>;
    handleCleanupOldData: () => Promise<void>;
}

const TeacherCommunicationContext = createContext<TeacherCommunicationContextType | undefined>(undefined);

export function TeacherCommunicationProvider({ children }: { children?: React.ReactNode }) {
    const { user } = useAuth();
    const { addToast } = useToast();
    
    // Consome dados de turmas para passar ao hook de comunicação
    const { teacherClasses, setTeacherClasses } = useTeacherClassContext();

    const commData = useTeacherCommunication(user, addToast, setTeacherClasses, teacherClasses);
    
    return (
        <TeacherCommunicationContext.Provider value={commData}>
            {children}
        </TeacherCommunicationContext.Provider>
    );
}

export const useTeacherCommunicationContext = () => {
    const context = useContext(TeacherCommunicationContext);
    if (context === undefined) {
        throw new Error('useTeacherCommunicationContext must be used within a TeacherCommunicationProvider');
    }
    return context;
};