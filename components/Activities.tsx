
import React, { useState, useRef, useEffect } from 'react';
import { Card } from './common/Card';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import type { Activity } from '../types';
import { SpinnerIcon } from '../constants/index';
import { cleanActivity } from '../utils/cleanActivity';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { useSettings } from '../contexts/SettingsContext';

const isRecent = (dateInput?: string | any) => {
    if (!dateInput) return false;
    let date: Date;
    if (dateInput?.toDate) {
        date = dateInput.toDate();
    } else {
        date = new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
};

const ActivityCard: React.FC<{ activity: Activity; onClick: () => void }> = ({ activity, onClick }) => {
    const { user } = useAuth();
    const { theme } = useSettings();
    const isAurora = theme === 'galactic-aurora';
    const isDragon = theme === 'dragon-year';
    const isEmerald = theme === 'emerald-sovereignty';

    const studentSubmission = activity.submissions?.find(s => s.studentId === user?.id);
    let statusText: string | null = null;
    let statusColor: string = '';

    if (studentSubmission) {
        statusText = studentSubmission.status;
        statusColor = statusText === 'Corrigido' 
            ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300';
    }

    // Tag Styles based on Theme
    let materiaColor = '';
    let unidadeColor = '';
    let typeColor = '';

    if (isAurora) {
        // Galactic Aurora: High contrast, neon colors on black
        materiaColor = 'bg-black text-[#E0AAFF] border border-[#E0AAFF]/40'; // Neon Purple
        unidadeColor = 'bg-[#1a1b26] text-white border border-[#2E2F3E]'; // Subtle Dark
        typeColor = 'bg-black text-[#99F6E4] border border-[#99F6E4]/40'; // Teal/Cyan
    } else if (isDragon) {
        // Dragon Year: High Contrast Red/Gold/Jade
        materiaColor = 'bg-[#5D0E0E] text-[#FFD700] border border-[#B71C1C]'; // Ruby & Gold
        unidadeColor = 'bg-[#FFF8E7] text-[#3E2723] border border-[#8D6E63]'; // Parchment & Ink
        typeColor = 'bg-[#2E7D32] text-white border border-[#1B5E20]'; // Jade
    } else if (isEmerald) {
        // Emerald Sovereignty (Doom): Dark Metal & Magic
        materiaColor = 'bg-[#064E3B] text-[#34D399] border border-[#D4AF37]'; // Emerald/Neon Green/Gold
        unidadeColor = 'bg-[#1F2937] text-[#E5E7EB] border border-[#374151]'; // Gunmetal/Silver/Steel
        typeColor = 'bg-black text-[#D4AF37] border border-[#D4AF37]'; // Black/Gold
    } else {
        // Standard Themes (Improved Light Theme Colors)
        // Before it was varying shades of gray/slate for unity/type. Now using subtle colors.
        const materiaColorMap: { [key: string]: string } = {
            'História': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
            'Geografia': 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
            'Ciências': 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
            'História Sergipana': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
        };
        materiaColor = activity.materia ? materiaColorMap[activity.materia] || 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-gray-100 text-gray-700 border border-gray-200';
        
        unidadeColor = 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
        typeColor = 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-600 dark:text-slate-300 dark:border-slate-500';
    }

    const isNew = !studentSubmission && isRecent(activity.createdAt);
    const isRecentlyGraded = studentSubmission?.status === 'Corrigido' && isRecent(studentSubmission.gradedAt);

    // Customize NEW badge for Aurora theme
    let newBadgeClass = "absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm z-10";
    if (isAurora) {
        // Blue Saber style - #00B7FF is Deep Sky Blue
        newBadgeClass = "absolute top-0 right-0 bg-[#00B7FF] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-[0_0_10px_#00B7FF] border-l border-b border-[#00B7FF] z-10";
    }

    // Acessibilidade: Construção do texto descritivo completo
    const typeInfo = activity.items ? `${activity.items.length} questões` : activity.type;
    const dateInfo = activity.dueDate ? `Prazo: ${new Date(activity.dueDate).toLocaleDateString('pt-BR')}` : 'Sem prazo definido';
    const statusInfo = statusText || 'A fazer';
    const pointsInfo = `${activity.points} pontos`;
    
    // Texto completo para o leitor de tela
    const fullDescription = `Atividade: ${activity.title}. 
    Matéria: ${activity.materia || 'Geral'}. 
    Unidade: ${activity.unidade || 'Geral'}. 
    Tipo: ${typeInfo}. 
    Status: ${statusInfo}. 
    Valor: ${pointsInfo}. 
    ${dateInfo}.
    Descrição: ${activity.description}`;

    return (
        <Card className="flex flex-col h-full group dark:hover:bg-slate-700/50 cursor-pointer relative overflow-hidden" >
            <button 
                onClick={onClick} 
                className="text-left flex flex-col h-full w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
                aria-label={fullDescription}
            >
                {isNew && (
                    <div className={newBadgeClass} aria-hidden="true">
                        NOVA
                    </div>
                )}
                {isRecentlyGraded && (
                    <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm z-10" aria-hidden="true">
                        NOTA DISPONÍVEL
                    </div>
                )}

                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors hc-text-primary pr-4 line-clamp-2" aria-hidden="true">{activity.title}</h3>
                        <div className="flex flex-col items-end flex-shrink-0 ml-2 space-y-2 mt-6" aria-hidden="true"> 
                             {statusText && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                                    {statusText}
                                </span>
                            )}
                        </div>
                    </div>
                     <div className="flex items-center flex-wrap gap-2 mt-3 text-xs font-medium" aria-hidden="true">
                        {activity.unidade && <span className={`px-2 py-1 rounded ${unidadeColor}`}>{activity.unidade}</span>}
                        {activity.materia && <span className={`px-2 py-1 rounded ${materiaColor}`}>{activity.materia}</span>}
                        <span className={`px-2 py-1 rounded ${typeColor}`}>
                            {activity.items ? `${activity.items.length} questão(ões)` : activity.type}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex-grow hc-text-secondary line-clamp-2" aria-hidden="true">{activity.description}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 hc-text-secondary" aria-hidden="true">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{activity.className || 'Turma desconhecida'}</span>
                    <div className="space-x-4">
                        <span>{activity.points} pts</span>
                        {activity.dueDate && <span>Prazo: {new Date(activity.dueDate).toLocaleDateString('pt-BR')}</span>}
                    </div>
                </div>
            </button>
        </Card>
    );
};


const Activities: React.FC = () => {
    const { studentClasses, searchActivities } = useStudentAcademic();
    const { openActivity } = useNavigation(); // Using Navigation Context to open activity page
    const { user } = useAuth();
    const { theme } = useSettings();
    const isAurora = theme === 'galactic-aurora';
    
    const [displayedActivities, setDisplayedActivities] = useState<Activity[]>([]);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(false);
    
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [selectedUnidade, setSelectedUnidade] = useState('all');
    const [selectedMateria, setSelectedMateria] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('a_fazer'); 

    const safeStudentClasses = studentClasses || [];
    const initialLoadDone = useRef(false);

    const unidadeOptions = ['1ª Unidade', '2ª Unidade', '3ª Unidade', '4ª Unidade'];
    const materiaOptions = ['História', 'Geografia', 'Filosofia', 'Sociologia', 'História Sergipana'];

    const filterActivitiesClientSide = (activitiesToFilter: Activity[]) => {
        if (!user) return [];
        
        return activitiesToFilter.filter(activity => {
            const studentSubmission = activity.submissions?.find(s => s.studentId === user.id);
            
            if (selectedStatus === 'all') return true;
            if (selectedStatus === 'a_fazer') return !studentSubmission;
            if (selectedStatus === 'pendente') return studentSubmission && studentSubmission.status === 'Aguardando correção';
            if (selectedStatus === 'corrigida') return studentSubmission && studentSubmission.status === 'Corrigido';
            
            return true;
        });
    };

    const handleSearch = async (isLoadMore = false) => {
        if (!user) return;
        setIsSearching(true);
        
        try {
            const cursor = isLoadMore ? lastDoc : null;
            
            const result = await searchActivities({
                classId: selectedClassId,
                materia: selectedMateria,
                unidade: selectedUnidade
            }, cursor);

            const filteredNewActivities = filterActivitiesClientSide(result.activities);

            if (isLoadMore) {
                setDisplayedActivities(prev => [...prev, ...filteredNewActivities]);
            } else {
                setDisplayedActivities(filteredNewActivities);
                setHasSearched(true);
            }

            setLastDoc(result.lastDoc);
            setHasMore(result.activities.length === 20); 

        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (!initialLoadDone.current && user) {
            handleSearch();
            initialLoadDone.current = true;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); 

    const handleActivityClick = (activity: Activity) => {
        // Instead of opening a modal, we navigate to the activity view page
        openActivity(cleanActivity(activity));
    };
    
    const filterSelectClasses = "flex-grow md:w-auto p-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200";

    // Define search button class based on theme
    let searchButtonClass = "w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors dark:ring-offset-slate-800 hc-button-primary-override";
    if (isAurora) {
        // Blue Lightsaber style - #00B7FF is Deep Sky Blue
        searchButtonClass = "w-full md:w-auto px-6 py-2.5 bg-[#00B7FF] text-white font-semibold rounded-lg hover:bg-[#0099CC] focus:outline-none focus:ring-2 focus:ring-[#00B7FF] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(0,183,255,0.6)] border border-[#00B7FF] hc-button-primary-override";
    }

    return (
        <div className="space-y-6">
            <p className="text-slate-500 dark:text-slate-400 hc-text-secondary">Encontre e realize suas atividades escolares.</p>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 flex flex-col md:flex-row flex-wrap items-center gap-4 hc-bg-override hc-border-override border border-slate-200 dark:border-slate-700">
                
                <div className="w-full md:w-auto flex-grow grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex flex-col">
                        <label htmlFor="status-filter" className="sr-only">Status</label>
                        <select id="status-filter" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className={filterSelectClasses}>
                            <option value="all">Todos os Status</option>
                            <option value="a_fazer">A fazer</option>
                            <option value="pendente">Pendente</option>
                            <option value="corrigida">Corrigida</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="class-filter" className="sr-only">Turma</label>
                        <select id="class-filter" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className={filterSelectClasses}>
                            <option value="all">Todas as turmas</option>
                            {safeStudentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="materia-filter" className="sr-only">Matéria</label>
                        <select id="materia-filter" value={selectedMateria} onChange={e => setSelectedMateria(e.target.value)} className={filterSelectClasses}>
                            <option value="all">Todas as matérias</option>
                            {materiaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="unidade-filter" className="sr-only">Unidade</label>
                        <select id="unidade-filter" value={selectedUnidade} onChange={e => setSelectedUnidade(e.target.value)} className={filterSelectClasses}>
                            <option value="all">Todas as unidades</option>
                            {unidadeOptions.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>

                <button
                    onClick={() => handleSearch(false)}
                    disabled={isSearching}
                    className={searchButtonClass}
                >
                    {isSearching && !hasSearched ? <SpinnerIcon className="h-5 w-5 text-white" /> : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            Buscar
                        </>
                    )}
                </button>
            </div>

            {isSearching && !displayedActivities.length && !hasSearched ? (
                 <div className="text-center py-20">
                    <SpinnerIcon className="h-10 w-10 text-indigo-500 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">Buscando atividades...</p>
                </div>
            ) : displayedActivities.length > 0 ? (
                <>
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {displayedActivities.map(activity => (
                            <li key={activity.id}>
                                <ActivityCard 
                                    activity={activity} 
                                    onClick={() => handleActivityClick(activity)} 
                                />
                            </li>
                        ))}
                    </ul>
                    {hasMore && (
                        <div className="flex justify-center pt-6">
                            <button
                                onClick={() => handleSearch(true)}
                                disabled={isSearching}
                                className="px-6 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-slate-800 transition-colors font-semibold flex items-center"
                            >
                                {isSearching && <SpinnerIcon className="h-4 w-4 mr-2 text-current" />}
                                Carregar Mais
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <Card className="text-center py-20">
                    <div className="flex justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Nenhuma atividade encontrada</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 hc-text-secondary">
                        {hasSearched ? "Tente ajustar os filtros para encontrar o que procura." : "Clique em Buscar para ver as atividades."}
                    </p>
                </Card>
            )}
        </div>
    );
};

export default Activities;
