
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import type { User, TeacherClass, GradeReport } from '../types';

export function useStudentReport(user: User | null, studentClasses: TeacherClass[]) {
    // Always initialize with an empty object
    const [gradeReport, setGradeReport] = useState<GradeReport>({});
    const [isLoadingReport, setIsLoadingReport] = useState(true);

    // Create a stable dependency string to avoid unnecessary re-runs if the array reference changes but IDs don't
    const classIdsString = useMemo(() => {
        return studentClasses.map(c => c.id).sort().join(',');
    }, [studentClasses]);

    useEffect(() => {
        let mounted = true;

        const fetchReport = async () => {
            if (!user) {
                if (mounted) {
                    setGradeReport({});
                    setIsLoadingReport(false);
                }
                return;
            }

            // Only fetch if we have classes (or if list is empty, we just return empty report)
            if (studentClasses.length === 0) {
                if (mounted) {
                    setGradeReport({});
                    setIsLoadingReport(false);
                }
                return;
            }

            if (mounted) setIsLoadingReport(true);

            try {
                const q = query(
                    collection(db, "student_grades"),
                    where("studentId", "==", user.id)
                );
                
                const snapshot = await getDocs(q);
                const report: GradeReport = {};

                // 1. Populate report from existing Firestore documents
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data && data.classId) {
                        report[data.classId] = {
                            className: data.className || 'Turma',
                            unidades: data.unidades || {} 
                        };
                    }
                });

                // 2. Fill in gaps for active classes that might not have a grade report yet
                studentClasses.forEach(cls => {
                    if (cls && cls.id && !report[cls.id]) {
                        report[cls.id] = {
                            className: cls.name || 'Turma',
                            unidades: {} 
                        };
                    }
                });

                if (mounted) setGradeReport(report);

            } catch (error) {
                console.error("Error fetching grade report:", error);
            } finally {
                if (mounted) setIsLoadingReport(false);
            }
        };

        fetchReport();

        return () => {
            mounted = false;
        };
    }, [user, classIdsString, studentClasses]); // Uses classIdsString to throttle, but studentClasses is needed for gap filling

    return { gradeReport, isLoadingReport };
}
