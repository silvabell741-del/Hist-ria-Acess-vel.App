import React, { createContext, useContext } from 'react';
import type { Notification } from '../types';
import { useAuth } from './AuthContext';
import { useStudentNotifications } from '../hooks/useStudentNotifications';
import { useStudentAcademic } from './StudentAcademicContext';

interface StudentNotificationContextType {
    notifications: Notification[];
    unreadNotificationCount: number;
    handleMarkAllNotificationsRead: () => Promise<void>;
    handleMarkNotificationAsRead: (id: string) => Promise<void>;
}

const StudentNotificationContext = createContext<StudentNotificationContextType | undefined>(undefined);

export function StudentNotificationProvider({ children }: { children?: React.ReactNode }) {
    const { user } = useAuth();
    // Notificações precisam das turmas para ouvir broadcasts, por isso dependemos do AcademicContext
    const { studentClasses } = useStudentAcademic();
    
    const notificationData = useStudentNotifications(user, studentClasses);

    return (
        <StudentNotificationContext.Provider value={notificationData}>
            {children}
        </StudentNotificationContext.Provider>
    );
}

export const useStudentNotificationsContext = () => {
    const context = useContext(StudentNotificationContext);
    if (context === undefined) {
        throw new Error('useStudentNotificationsContext must be used within a StudentNotificationProvider');
    }
    return context;
};