
import React, { useState, useRef, useEffect, useContext } from 'react';
import type { ModulePageContent, ModulePage } from '../types';
import { Card } from './common/Card';
import { useNavigation } from '../contexts/NavigationContext';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { SpinnerIcon } from '../constants/index';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { getSessionCache, setSessionCache } from '../utils/cacheUtils';
import { getOfflineModule } from '../utils/offlineManager';
import { useToast } from '../contexts/ToastContext';


// Helper to extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const SafeImage: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    if (hasError || !src) {
        return (
            <div className={`${className} my-4 flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg aspect-video max-h-96 mx-auto`}>
                <div className="text-center p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xs mt-2 font-semibold">Não foi possível carregar a imagem.</p>
                    <p className="text-xs mt-1 text-slate-400">Verifique se a URL é um link direto para a imagem.</p>
                    {src && <p className="text-xs mt-1 break-all text-slate-400">{src}</p>}
                </div>
            </div>
        );
    }
    
    return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setHasError(true)} crossOrigin="anonymous" />;
};


const PageContent: React.FC<{ content: ModulePageContent[] }> = React.memo(({ content }) => {
    const { theme } = useSettings();
    const isLight = theme === 'light';
    
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="prose prose-slate dark:prose-invert max-w-none hc-text-override">
            {content.map((item, index) => {
                const alignMap: Record<string, string> = {
                    left: 'text-left',
                    center: 'text-center',
                    right: 'text-right',
                    justify: 'text-justify'
                };
                const alignClass = item.align ? alignMap[item.align] : 'text-left';
                
                const colorIsWhite = item.color?.toLowerCase() === '#ffffff' || item.color?.toLowerCase() === 'white';
                
                let finalColor = item.color;
                if (isLight) {
                    if (!finalColor || colorIsWhite) {
                        finalColor = '#191970';
                    }
                }
                const textStyle = { color: finalColor };

                switch (item.type) {
                    case 'title':
                        return <h3 key={index} style={textStyle} className={`text-3xl font-bold !mb-4 !mt-6 first:!mt-0 ${alignClass}`}>{item.content}</h3>;
                    case 'paragraph':
                        return <p key={index} style={textStyle} className={alignClass}>{item.content}</p>;
                    case 'image':
                        return (
                            <figure key={index} className="my-4">
                                <SafeImage src={item.content as string} alt={item.alt || 'Imagem do módulo'} className="rounded-lg shadow-md max-h-96 mx-auto" />
                                {item.alt && (
                                    <figcaption className="text-center text-sm mt-2 text-slate-600 dark:text-slate-300 hc-text-secondary">
                                        {item.alt}
                                    </figcaption>
                                )}
                            </figure>
                        );
                    case 'list':
                        return (
                            <ul key={index} className="list-disc pl-5">
                                {(item.content as string[]).map((li, i) => <li key={i} style={textStyle}>{li}</li>)}
                            </ul>
                        );
                    case 'quote':
                        return <blockquote key={index} className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic my-4"><p style={textStyle}>{item.content}</p></blockquote>;
                    case 'video':
                        const videoUrl = item.content as string;
                        const videoId = getYouTubeVideoId(videoUrl);
                        const isOffline = !isOnline;
                        
                        if (isOffline) {
                             return (
                                <div key={index} className="my-6 aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center p-4 text-center border border-slate-200 dark:border-slate-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" /></svg>
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Vídeo indisponível offline</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Conecte-se à internet para assistir este conteúdo.</p>
                                </div>
                            )
                        }

                        return videoId ? (
                            <div key={index} className="my-6 aspect-video">
                            <iframe 
                                    className="w-full h-full rounded-lg shadow-md"
                                    src={`https://www.youtube.com/embed/${videoId}`} 
                                    title="YouTube video player" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                    referrerPolicy="strict-origin-when-cross-origin"
                                ></iframe>
                            </div>
                        ) : <p key={index} className="text-red-500 my-4">Link do vídeo do YouTube inválido ou não suportado: {videoUrl}</p>;
                    case 'divider':
                        return <hr key={index} className="my-8 dark:border-slate-700" />;
                    default:
                        return null;
                }
            })}
        </div>
    );
});

const ModuleViewPage: React.FC = () => {
    const { activeModule: module, exitModule: onExit } = useNavigation();
    const { userRole } = useAuth();
    const { addToast } = useToast();
    
    let studentData: any = {};
    if (userRole === 'aluno') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        studentData = useStudentAcademic();
    }
    
    let teacherData: any = {};
    if (userRole === 'professor') {
        try {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            teacherData = useTeacherAcademicContext();
        } catch { /* context might not be ready */ }
    }

    // Select the correct context and handlers based on user role
    const dataContext = userRole === 'aluno' ? studentData : teacherData;
    
    // Extração segura de funções
    const handleModuleComplete = dataContext?.handleModuleComplete || (async () => {});
    const handleModuleProgressUpdate = dataContext?.handleModuleProgressUpdate || (async () => {});

    const [pageIndex, setPageIndex] = useState(0);
    const [announcement, setAnnouncement] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    
    const [contentPages, setContentPages] = useState<ModulePage[]>([]);
    const [isLoadingContent, setIsLoadingContent] = useState(false);

    useEffect(() => {
        setPageIndex(0);
        setContentPages([]); // Reset content
        setIsOfflineMode(false);
        
        const loadContent = async () => {
            if (!module) return;

            // 1. Legacy Check: If module has pages embedded, use them.
            if (module.pages && module.pages.length > 0) {
                setContentPages(module.pages);
                setAnnouncement(`Módulo ${module.title}, página 1 de ${module.pages.length} exibida.`);
                return;
            }

            // 2. Cache Check
            const cacheKey = `module_content_${module.id}`;
            const cachedPages = getSessionCache(cacheKey);
            if (cachedPages) {
                setContentPages(cachedPages);
                if (cachedPages.length > 0) {
                    setAnnouncement(`Módulo ${module.title}, página 1 de ${cachedPages.length} exibida (Cache).`);
                }
                getOfflineModule(module.id).then(off => {
                    if(off) setIsOfflineMode(true);
                });
                return;
            }

            setIsLoadingContent(true);

            try {
                // 3. Offline Check
                const offlineData = await getOfflineModule(module.id);
                if (offlineData && offlineData.pages && offlineData.pages.length > 0) {
                    setContentPages(offlineData.pages);
                    setIsOfflineMode(true);
                    setAnnouncement(`Módulo ${module.title}, página 1 de ${offlineData.pages.length} exibida (Offline).`);
                    setIsLoadingContent(false);
                    return;
                }

                // 4. Fetch Check
                const contentRef = doc(db, 'module_contents', module.id);
                const contentSnap = await getDoc(contentRef);
                
                if (contentSnap.exists()) {
                    const data = contentSnap.data();
                    const pages = data.pages || [];
                    setContentPages(pages);
                    
                    setSessionCache(cacheKey, pages);

                    if (pages.length > 0) {
                        setAnnouncement(`Módulo ${module.title}, página 1 de ${pages.length} exibida.`);
                    } else {
                        setAnnouncement(`Módulo ${module.title} carregado. Sem páginas.`);
                    }
                } else {
                    setContentPages([]);
                    setAnnouncement(`Conteúdo do módulo ${module.title} não encontrado.`);
                }
            } catch (error) {
                console.error("Failed to load module content:", error);
                if (!navigator.onLine) {
                     addToast("Você está sem internet e este módulo não foi baixado.", "error");
                } else {
                     addToast("Erro ao carregar conteúdo. Tente novamente.", "error");
                }
            } finally {
                setIsLoadingContent(false);
            }
        };

        loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [module?.id]);

    if (!module) {
        return (
            <Card>
                <p>Módulo não encontrado.</p>
                <button onClick={onExit} className="mt-4 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400 hc-link-override">
                    &larr; Voltar para Módulos
                </button>
            </Card>
        );
    }

    if (userRole !== 'admin' && !dataContext) {
        return (
            <Card>
                <div className="flex justify-center items-center h-full p-8">
                    <SpinnerIcon className="h-8 w-8 text-indigo-500" />
                    <span className="ml-4 text-slate-500">Carregando dados...</span>
                </div>
            </Card>
        );
    }
    
    if (isLoadingContent) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <SpinnerIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Baixando conteúdo do módulo...</p>
            </div>
        );
    }
    
    const totalPages = contentPages.length;
    const currentPage = totalPages > 0 ? contentPages[pageIndex] : null;
    const isLastPage = pageIndex >= totalPages - 1;

    const progressPercentage = totalPages > 0 ? ((pageIndex + 1) / totalPages) * 100 : 100;

    const saveAndExit = async () => {
        if (isExiting || isCompleting) return;
        setIsExiting(true);

        if (userRole === 'aluno' && module && totalPages > 0) {
            if (module.progress === 100) {
                onExit();
                return;
            }

            if (!navigator.onLine) {
                 onExit();
                 return;
            }

            const currentProgress = ((pageIndex + 1) / totalPages) * 100;
            
            try {
                await handleModuleProgressUpdate(module.id, currentProgress);
            } catch (error) {
                console.error("Erro ao salvar progresso ao sair:", error);
            }
        }
        onExit();
    };

    const handleNext = async () => {
        if (isLastPage) {
            if (userRole === 'aluno') {
                if (!navigator.onLine) {
                    alert("Conecte-se à internet para concluir o módulo e salvar seu progresso.");
                    onExit();
                    return;
                }

                setIsCompleting(true);
                await handleModuleComplete(module.id);
                onExit();
            } else {
                onExit();
            }
        } else if (pageIndex < totalPages - 1) {
            const newIndex = pageIndex + 1;
            setPageIndex(newIndex);
            setAnnouncement(`Página ${newIndex + 1} de ${totalPages} exibida.`);
        }
    };

    const handlePrev = () => {
        if (pageIndex > 0) {
            const newIndex = pageIndex - 1;
            setPageIndex(newIndex);
            setAnnouncement(`Página ${newIndex + 1} de ${totalPages} exibida.`);
        }
    };
    
    const finishButtonClass = isLastPage 
        ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
        : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600";

    return (
        <div className="space-y-6">
            <div className="sr-only" aria-live="polite" role="status">{announcement}</div>
            
            {isOfflineMode && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg flex items-center justify-center text-sm font-medium mb-4 shadow-sm animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" /></svg>
                    Modo Offline: Você está acessando o conteúdo baixado.
                </div>
            )}

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <button 
                        onClick={saveAndExit} 
                        disabled={isExiting || isCompleting}
                        className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400 hc-link-override disabled:opacity-50"
                    >
                        {isExiting ? 'Salvando...' : '← Voltar para Módulos'}
                    </button>
                </div>
                
                {totalPages > 0 && (
                    <div 
                        className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-6"
                        role="progressbar"
                        aria-valuenow={progressPercentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progresso do módulo: ${Math.round(progressPercentage)}%`}
                    >
                        <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                )}

                {currentPage ? (
                    <>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">{currentPage.title}</h2>
                        <PageContent content={currentPage.content} />
                    </>
                ) : (
                    <div className="text-center py-10">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Módulo em Breve</h2>
                        <p className="text-slate-600 dark:text-slate-300 mt-2 hc-text-secondary">Este módulo ainda não possui conteúdo. Volte mais tarde!</p>
                    </div>
                )}
            </Card>

            <div className="flex justify-between items-center">
                <button
                    onClick={handlePrev}
                    disabled={pageIndex === 0 || isCompleting || isExiting}
                    className="px-6 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override"
                >
                    Anterior
                </button>
                {totalPages > 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">Página {pageIndex + 1} de {totalPages}</p>
                )}
                <button
                    onClick={handleNext}
                    disabled={isCompleting || isExiting}
                    className={`px-6 py-2 text-white font-semibold rounded-lg hc-button-primary-override flex items-center justify-center min-w-[140px] disabled:opacity-75 disabled:cursor-not-allowed ${finishButtonClass}`}
                >
                    {isCompleting ? (
                        <>
                            <SpinnerIcon className="h-5 w-5 mr-2" />
                            <span>Finalizando...</span>
                        </>
                    ) : (
                        isLastPage ? 'Concluir' : 'Próximo'
                    )}
                </button>
            </div>
        </div>
    );
};

export default ModuleViewPage;
