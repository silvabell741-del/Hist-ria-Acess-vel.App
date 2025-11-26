import React, { createContext, useContext } from 'react';
import type { Achievement, UserStats } from '../types';
import { useAuth } from './AuthContext';
import { useStudentGamification } from '../hooks/useStudentGamification';

interface StudentGamificationContextType {
    achievements: Achievement[];
    userStats: UserStats;
    loadGamificationData: () => Promise<void>;
    handleQuizCompleteLogic: (quizId: string, title: string, score: number, total: number) => Promise<number>;
}

const StudentGamificationContext = createContext<StudentGamificationContextType | undefined>(undefined);

export function StudentGamificationProvider({ children }: { children?: React.ReactNode }) {
    const { user } = useAuth();
    const gamification = useStudentGamification(user);

    return (
        <StudentGamificationContext.Provider value={gamification}>
            {children}
        </StudentGamificationContext.Provider>
    );
}

export const useStudentGamificationContext = () => {
    const context = useContext(StudentGamificationContext);
    if (context === undefined) {
        throw new Error('useStudentGamificationContext must be used within a StudentGamificationProvider');
    }
    return context;
};