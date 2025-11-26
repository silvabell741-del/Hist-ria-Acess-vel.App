






import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useTeacherCommunicationContext } from '../contexts/TeacherCommunicationContext';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { Modal } from './common/Modal';
import type { Turno, AttendanceSession, AttendanceRecord, AttendanceStatus, Activity } from '../types'; // Added Activity type
import { collection, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useAuth } from '../contexts/AuthContext';

// --- Constants ---
const AVAILABLE_SUBJECTS = [
    'Artes', 'Biologia', 'Ciências', 'Educação Física', 'Espanhol', 'Filosofia', 'Física', 
    'Geografia', 'História', 'História Sergipana', 'Inglês', 'Matemática', 
    'Português / Literatura', 'Química', 'Sociologia', 'Tecnologia / Informática'
];

// --- Helper Components ---
const InputField: React.FC<{ label: string, required?: boolean, children: React.ReactNode }> = ({ label, required, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

// --- Modal: Invite Teacher (Fase 3) ---
interface InviteTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string, subject: string) => Promise<void>;
    isLoading: boolean;
}

const InviteTeacherModal: React.FC<InviteTeacherModalProps> = ({ isOpen, onClose, onInvite, isLoading }) => {
    const [email, setEmail] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

    const handleSubmit = () => {
        if (email && selectedSubjects.length > 0 && !isLoading) {
            // Junta as matérias em uma string para manter compatibilidade com o backend atual
            const subjectString = selectedSubjects.join(', ');
            onInvite(email, subjectString);
        }
    };

    const toggleSubject = (subject: string) => {
        setSelectedSubjects(prev => 
            prev.includes(subject) 
                ? prev.filter(s => s !== subject) 
                : [...prev, subject]
        );
    };

    // Reset fields on open/close
    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setSelectedSubjects([]);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Convidar Professor">
            <div className="space-y-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Adicione outro professor a esta turma. Eles poderão criar atividades e gerenciar alunos.
                </p>
                
                <InputField label="Email do Professor" required>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="exemplo@escola.com"
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                    />
                </InputField>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 hc-text-secondary">
                        Matérias/Disciplinas (Selecione uma ou mais) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
                        {AVAILABLE_SUBJECTS.map(subj => {
                            const isSelected = selectedSubjects.includes(subj);
                            return (
                                <button
                                    key={subj}
                                    type="button"
                                    onClick={() => toggleSubject(subj)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                                        isSelected 
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md dark:bg-indigo-500 dark:border-indigo-500' 
                                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {subj}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-right">
                        {selectedSubjects.length} selecionada(s)
                    </p>
                </div>

                <div className="flex justify-end items-center pt-4 space-x-3 border-t dark:border-slate-700 mt-6">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500 hc-button-override"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isLoading || !email || selectedSubjects.length === 0} 
                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[140px] dark:bg-indigo-500 dark:hover:bg-indigo-600 hc-button-primary-override"
                    >
                        {isLoading ? <SpinnerIcon /> : 'Enviar Convite'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- Attendance Student Item Component ---
const AttendanceStudentItem: React.FC<{ 
    record: AttendanceRecord; 
    canEdit: boolean; 
    onUpdateStatus: (status: AttendanceStatus) => void;
    isUpdating: boolean;
}> = ({ record, canEdit, onUpdateStatus, isUpdating }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{record.studentName}</p>
                <p className={`text-xs font-medium ${
                    record.status === 'presente' ? 'text-green-600 dark:text-green-400' :
                    record.status === 'ausente' ? 'text-red-600 dark:text-red-400' :
                    'text-slate-500 dark:text-slate-400'
                }`}>
                    {record.status === 'pendente' ? 'Pendente' : record.status === 'presente' ? 'Presente' : 'Ausente'}
                </p>
            </div>
            
            <div className="flex space-x-2">
                <button
                    onClick={() => onUpdateStatus('presente')}
                    disabled={!canEdit || isUpdating}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                        record.status === 'presente' 
                            ? 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700' 
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-green-900/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label={`Marcar ${record.studentName} como presente`}
                    aria-pressed={record.status === 'presente'}
                >
                    Presente
                </button>
                <button
                    onClick={() => onUpdateStatus('ausente')}
                    disabled={!canEdit || isUpdating}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                        record.status === 'ausente' 
                            ? 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700' 
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-red-900/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label={`Marcar ${record.studentName} como ausente`}
                    aria-pressed={record.status === 'ausente'}
                >
                    Ausente
                </button>
            </div>
        </div>
    );
};

// --- Attendance Session Detail View ---
const AttendanceSessionView: React.FC<{ session: AttendanceSession, onBack: () => void }> = ({ session, onBack }) => {
    const { handleUpdateAttendanceStatus } = useTeacherClassContext();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Verifica regra de 7 dias
    const canEdit = useMemo(() => {
        if (!session.createdAt) return true;
        const createdDate = new Date(session.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays <= 7;
    }, [session.createdAt]);

    useEffect(() => {
        let mounted = true;
        const fetchRecords = async () => {
            try {
                const recordsRef = collection(db, "attendance_sessions", session.id, "records");
                const snapshot = await getDocs(recordsRef);
                if (!mounted) return;
                
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
                // Ordenação alfabética por nome
                data.sort((a, b) => a.studentName.localeCompare(b.studentName));
                setRecords(data);
            } catch (error) {
                console.error("Error fetching records:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchRecords();
        return () => { mounted = false; };
    }, [session.id]);

    const onUpdateStatus = async (recordId: string, status: AttendanceStatus) => {
        if (!canEdit) return;
        
        // Optimistic UI Update: Update local state immediately
        setRecords(prevRecords => 
            prevRecords.map(r => r.id === recordId ? { ...r, status } : r)
        );

        setUpdatingId(recordId);
        try {
            await handleUpdateAttendanceStatus(session.id, recordId, status);
        } catch (error) {
            console.error("Failed to update status remotely", error);
        } finally {
            setUpdatingId(null);
        }
    };

    const stats = useMemo(() => {
        const total = records.length;
        const present = records.filter(r => r.status === 'presente').length;
        const absent = records.filter(r => r.status === 'ausente').length;
        const pending = total - present - absent;
        return { total, present, absent, pending };
    }, [records]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        Chamada de {new Date(session.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                        {session.turno} • {session.horario}º Horário
                    </p>
                </div>
                <div className="flex-grow" />
                 {!canEdit && (
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-red-900/30 dark:text-red-300">
                        Edição Fechada
                    </span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">Presentes</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.present}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 text-center">
                    <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase">Ausentes</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.absent}</p>
                </div>
                 <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Pendentes</p>
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.pending}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10"><SpinnerIcon className="h-8 w-8 text-indigo-500 mx-auto" /></div>
            ) : records.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum aluno encontrado nesta chamada.</p>
            ) : (
                <div className="space-y-2">
                    {records.map(record => (
                        <AttendanceStudentItem
                            key={record.id}
                            record={record}
                            canEdit={canEdit}
                            isUpdating={updatingId === record.id}
                            onUpdateStatus={(status) => onUpdateStatus(record.id, status)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Date Group Accordion Item ---
const DateAccordionItem: React.FC<{ 
    date: string, 
    sessions: AttendanceSession[], 
    onSelectSession: (s: AttendanceSession) => void,
    defaultOpen?: boolean
}> = ({ date, sessions, onSelectSession, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const sortedSessions = useMemo(() => {
        const turnoOrder: Record<string, number> = { matutino: 1, vespertino: 2, noturno: 3 };
        return [...sessions].sort((a, b) => {
            // 1. Sort by Shift (Matutino -> Vespertino -> Noturno)
            const tA = turnoOrder[a.turno] || 99;
            const tB = turnoOrder[b.turno] || 99;
            if (tA !== tB) return tA - tB;
            // 2. Sort by Schedule Slot (1 -> 6)
            return a.horario - b.horario;
        });
    }, [sessions]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center space-x-3">
                    <span className="text-xl" aria-hidden="true">📅</span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">
                         {new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h4>
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                        {sessions.length}
                    </span>
                </div>
                 <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {sortedSessions.map(session => (
                        <button 
                            key={session.id} 
                            onClick={() => onSelectSession(session)}
                            className="w-full text-left p-4 pl-12 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors flex justify-between items-center group"
                        >
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-200 capitalize flex items-center">
                                    <span className={`w-2 h-2 rounded-full mr-2 ${session.turno === 'matutino' ? 'bg-yellow-400' : session.turno === 'vespertino' ? 'bg-orange-400' : 'bg-indigo-400'}`}></span>
                                    {session.turno} <span className="mx-2 text-slate-300 dark:text-slate-600">|</span> {session.horario}º Horário
                                </p>
                            </div>
                            <div className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Session List Component (Grouped by Date) ---
const SessionList: React.FC<{ sessions: AttendanceSession[], onSelectSession: (session: AttendanceSession) => void }> = ({ sessions, onSelectSession }) => {
    const groupedSessions = useMemo(() => {
        const grouped: Record<string, AttendanceSession[]> = {};
        sessions.forEach(session => {
            if (!grouped[session.date]) {
                grouped[session.date] = [];
            }
            grouped[session.date].push(session);
        });
        return grouped;
    }, [sessions]);
    
    const sortedDates = useMemo(() => {
        return Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a));
    }, [groupedSessions]);

    if (sessions.length === 0) {
        return (
             <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">Nenhuma chamada registrada para esta turma.</p>
            </div>
        );
    }

    return (
        <div className="space-y-1 mt-4">
            {sortedDates.map((date, index) => (
                <DateAccordionItem 
                    key={date} 
                    date={date} 
                    sessions={groupedSessions[date]} 
                    onSelectSession={onSelectSession}
                    defaultOpen={index === 0} 
                />
            ))}
        </div>
    );
};

// --- Main ClassView Component ---
const ClassView: React.FC = () => {
    const { user } = useAuth();
    const { activeClass, exitClass, startGrading } = useNavigation(); // Added startGrading
    
    // Usando contextos específicos
    const { handleCreateAttendanceSession, fetchClassDetails, attendanceSessionsByClass, handleUpdateAttendanceStatus, isSubmittingClass, handleLeaveClass, handleArchiveClass } = useTeacherClassContext();
    const { handleInviteTeacher, isSubmittingComm } = useTeacherCommunicationContext();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
    
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Modal State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [turno, setTurno] = useState<Turno>('matutino');
    const [horario, setHorario] = useState<number>(1);

    useEffect(() => {
        if (activeClass && !activeClass.isFullyLoaded) {
            fetchClassDetails(activeClass.id);
        }
    }, [activeClass, fetchClassDetails]);

    const sessions = activeClass ? (attendanceSessionsByClass[activeClass.id] || []) : [];
    const isOwner = user && activeClass && activeClass.teacherId === user.id;

    if (!activeClass) {
        return (
            <div className="p-8 text-center">
                <p>Nenhuma turma selecionada.</p>
                <button onClick={exitClass} className="mt-4 text-indigo-600 hover:underline">Voltar ao Dashboard</button>
            </div>
        );
    }

    const handleCreate = async () => {
        if (!date || !activeClass) return;
        await handleCreateAttendanceSession(activeClass.id, date, turno, horario);
        setIsModalOpen(false);
    };

    const onInviteTeacherWrapper = async (email: string, subject: string) => {
        await handleInviteTeacher(activeClass.id, email, subject);
        setIsInviteModalOpen(false);
    };

    const confirmLeave = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await handleLeaveClass(activeClass.id);
            setIsLeaveModalOpen(false);
            exitClass();
        } catch (error) {
            // Error is handled in hook (toast)
        } finally {
            setIsProcessing(false);
        }
    }

    const confirmArchive = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await handleArchiveClass(activeClass.id);
            setIsArchiveModalOpen(false);
            exitClass();
        } catch (error) {
            // Error is handled in hook (toast)
        } finally {
            setIsProcessing(false);
        }
    }

    const onViewSubmissionsClick = (activity: Activity) => {
        // Use navigation to open Grading Station instead of modal
        startGrading(activity);
    };

    if (selectedSession) {
        return (
            <Card>
                <AttendanceSessionView 
                    session={selectedSession} 
                    onBack={() => setSelectedSession(null)} 
                />
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2">
                         <button onClick={exitClass} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{activeClass.name}</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 ml-8 hc-text-secondary">Gerencie chamadas e presença</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {!isOwner && (
                        <button
                            onClick={() => setIsLeaveModalOpen(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-white border border-red-200 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition-colors shadow-sm dark:bg-slate-800 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20 hc-button-override"
                            title="Sair da Turma"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="hidden sm:inline">Sair</span>
                        </button>
                    )}
                    {isOwner && (
                        <>
                            <button 
                                onClick={() => setIsArchiveModalOpen(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 hc-button-override"
                                title="Concluir Turma (Arquivar)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                <span className="hidden sm:inline">Concluir Turma</span>
                            </button>
                            <button 
                                onClick={() => setIsInviteModalOpen(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-sm dark:bg-slate-800 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-slate-700 hc-button-override"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                <span>Convidar Professor</span>
                            </button>
                        </>
                    )}
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hc-button-primary-override"
                    >
                        <div className="h-5 w-5">{ICONS.plus}</div>
                        <span>Criar Nova Chamada</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                            {ICONS.chamada}
                            <span className="ml-2">Histórico de Chamadas</span>
                        </h2>
                        <SessionList 
                            sessions={sessions} 
                            onSelectSession={setSelectedSession} 
                        />
                    </Card>
                    
                    <Card className="!p-0 overflow-hidden">
                        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                {ICONS.teacher_create_module}
                                <span className="ml-2">Atividades da Turma</span>
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {activeClass.activities && activeClass.activities.length > 0 ? (
                                activeClass.activities.map(activity => (
                                    <div key={activity.id} className="p-4 rounded-lg bg-white border border-slate-200 dark:bg-slate-700/50 dark:border-slate-700 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{activity.title}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                {activity.submissionCount ?? activity.submissions?.length ?? 0} respostas • Prazo: {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString('pt-BR') : 'N/D'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => onViewSubmissionsClick(activity)} 
                                            className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 border border-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 dark:border-indigo-800 hc-button-override"
                                        >
                                            Ver Respostas
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-sm text-slate-500 py-4">Nenhuma atividade disponível.</p>
                            )}
                        </div>
                    </Card>
                </div>
                
                <div className="space-y-6">
                    <Card className="bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Resumo da Turma</h3>
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <p>Código: <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">{activeClass.code}</span></p>
                            {/* Exibe apenas contagem de alunos ativos */}
                            <p>Alunos Ativos: {activeClass.studentCount || (activeClass.students?.filter(s => s.status !== 'inactive').length || 0)}</p>
                        </div>
                    </Card>

                    {/* Seção de Professores (Corpo Docente) */}
                    <Card className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            Corpo Docente
                        </h3>
                        <div className="space-y-3">
                            {(activeClass.teachers || [activeClass.teacherId]).map((tid) => {
                                const subject = activeClass.subjects?.[tid] || 'Regente';
                                const name = activeClass.teacherNames?.[tid] || (tid === activeClass.teacherId ? 'Professor (Dono)' : 'Professor');
                                const isMe = user?.id === tid;
                                return (
                                    <div key={tid} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-slate-800 rounded border border-indigo-50 dark:border-indigo-900/50">
                                        <div>
                                            <p className="font-semibold text-slate-700 dark:text-slate-200">{name} {isMe && <span className="text-xs text-indigo-500">(Você)</span>}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{subject}</p>
                                        </div>
                                        {tid === activeClass.teacherId && (
                                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-300">Dono</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modal de Criação de Chamada */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Criar chamada para ${activeClass.name}`}>
                <div className="space-y-6">
                    <InputField label="Data da Aula" required>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                        />
                    </InputField>
                    
                    <InputField label="Turno" required>
                        <div className="flex space-x-4">
                            {(['matutino', 'vespertino', 'noturno'] as const).map(t => (
                                <label key={t} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="turno"
                                        value={t}
                                        checked={turno === t}
                                        onChange={() => setTurno(t)}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">{t}</span>
                                </label>
                            ))}
                        </div>
                    </InputField>

                    <InputField label="Horário" required>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6].map(h => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => setHorario(h)}
                                    className={`p-3 text-sm font-semibold rounded-lg transition-colors border ${
                                        horario === h 
                                        ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500' 
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {h}º horário
                                </button>
                            ))}
                        </div>
                    </InputField>

                    <div className="flex justify-end items-center pt-4 space-x-3 border-t dark:border-slate-700 mt-6">
                        <button 
                            onClick={() => setIsModalOpen(false)} 
                            className="px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500 hc-button-override"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleCreate} 
                            disabled={isSubmittingClass || !date} 
                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[140px] dark:bg-indigo-500 dark:hover:bg-indigo-600 hc-button-primary-override"
                        >
                            {isSubmittingClass ? <SpinnerIcon /> : 'Criar Chamada'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Convite */}
            <InviteTeacherModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                onInvite={onInviteTeacherWrapper}
                isLoading={isSubmittingComm}
            />

            {/* Modal de Confirmação de Saída */}
            <Modal 
                isOpen={isLeaveModalOpen} 
                onClose={() => !isProcessing && setIsLeaveModalOpen(false)} 
                title="Sair da Turma"
            >
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300">
                        Você tem certeza que deseja sair da turma <strong>{activeClass.name}</strong>?
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-start">
                            <span className="mr-2">⚠️</span>
                            <span>Você perderá o acesso a esta turma e não poderá mais gerenciá-la.</span>
                        </p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button 
                            onClick={() => setIsLeaveModalOpen(false)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmLeave}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center disabled:opacity-50"
                        >
                            {isProcessing ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                            Confirmar Saída
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmação de Arquivamento */}
            <Modal 
                isOpen={isArchiveModalOpen} 
                onClose={() => !isProcessing && setIsArchiveModalOpen(false)} 
                title="Concluir e Arquivar Turma"
            >
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300">
                        Tem certeza que deseja marcar a turma <strong>{activeClass.name}</strong> como concluída?
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-900/20 dark:border-blue-800">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            Ela será movida para o arquivo e não aparecerá mais no seu painel principal, mas você ainda poderá acessá-la pelo Histórico Escolar.
                        </p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button 
                            onClick={() => setIsArchiveModalOpen(false)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmArchive}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center disabled:opacity-50"
                        >
                            {isProcessing ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                            Arquivar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ClassView;