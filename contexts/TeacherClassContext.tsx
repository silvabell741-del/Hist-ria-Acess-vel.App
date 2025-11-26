

import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useTeacherClasses } from '../hooks/teacher/useTeacherClasses';
import type { TeacherClass, AttendanceSession, Turno, AttendanceStatus } from '../types';

export interface TeacherClassContextType {
    teacherClasses: TeacherClass[];
    archivedClasses: TeacherClass[]; // Nova lista
    attendanceSessionsByClass: Record<string, AttendanceSession[]>;
    isLoadingClasses: boolean;
    isSubmittingClass: boolean;
    fetchTeacherClasses: (forceRefresh?: boolean) => Promise<void>;
    fetchClassDetails: (classId: string) => Promise<void>;
    handleCreateClass: (name: string) => Promise<void>;
    handleArchiveClass: (classId: string) => Promise<void>; // Nova função
    handleCreateAttendanceSession: (classId: string, date: string, turno: Turno, horario: number) => Promise<void>;
    handleUpdateAttendanceStatus: (sessionId: string, recordId: string, status: AttendanceStatus) => Promise<void>;
    handleLeaveClass: (classId: string) => Promise<void>;
    getAttendanceSession: (sessionId: string) => Promise<AttendanceSession | null>;
    setTeacherClasses: React.Dispatch<React.SetStateAction<TeacherClass[]>>;
}

const TeacherClassContext = createContext<TeacherClassContextType | undefined>(undefined);

export function TeacherClassProvider({ children }: { children?: React.ReactNode }) {
    const { user } = useAuth();
    const { addToast } = useToast();

    const classData = useTeacherClasses(user, addToast);

    return (
        <TeacherClassContext.Provider value={classData}>
            {children}
        </TeacherClassContext.Provider>
    );
}

export const useTeacherClassContext = () => {
    const context = useContext(TeacherClassContext);
    if (context === undefined) {
        throw new Error('useTeacherClassContext must be used within a TeacherClassProvider');
    }
    return context;
};