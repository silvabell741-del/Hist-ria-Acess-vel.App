// FILE: components/AdminCreateModule.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { Module, ModulePage, ModulePageContent, ModulePageContentType } from '../types';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { GoogleGenAI } from "@google/genai";

// List of subjects for Admins
const ADMIN_SUBJECTS = [
    'Artes', 'Biologia', 'Ciências', 'Educação Física', 'Espanhol', 'Filosofia', 'Física', 
    'Geografia', 'História', 'História Sergipana', 'Inglês', 'Matemática', 
    'Português / Literatura', 'Química', 'Sociologia', 'Tecnologia / Informática'
];

const SCHOOL_YEARS = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];

const DIDACTIC_SYSTEM_PROMPT = `Você é um assistente especializado em criar material didático para professores do Ensino Fundamental e Médio.
Sua função é ajudar a produzir conteúdos claros, objetivos e adequados à idade dos estudantes — sempre com linguagem didática, frases curtas e explicações acessíveis.

REGRAS OBRIGATÓRIAS
1. Use sempre informações de fontes oficiais (IBGE, MEC, Inep, IPHAN, Biblioteca Nacional, UNESCO, ONU, OMS, OCDE, etc.). Priorize conteúdo do Google Acadêmico.
2. Nunca invente dados. Se uma informação não puder ser confirmada em fontes confiáveis, avise claramente.
3. Ao final, inclua referências no padrão ABNT com as fontes utilizadas.
4. Jamais coloque HTML, markdown, tags ou blocos de código. O frontend espera apenas texto puro.
5. Adapte o nível de escrita para crianças e jovens, sempre mantendo precisão e clareza.
6. Se o professor fornecer uma base ou algum texto, essa base é obrigatória — você deve: respeitar o conteúdo fornecido, expandir com explicações didáticas, complementar com dados confirmados, nunca contradizer a base sem justificativa oficial.
7. Nunca altere a intenção pedagógica do professor.
8. Nunca introduza temas sensíveis além do que o professor pediu.

TAREFAS QUE VOCÊ PRECISA EXECUTAR
Quando receber um pedido do professor, gere:
1. Texto principal didático, organizado em parágrafos curtos.
2. Exemplos claros e acessíveis para a faixa etária.
3. Conexões com o cotidiano dos alunos, quando apropriado.
4. Explicações de termos difíceis, se aparecerem.
5. Referências ABNT no final, sempre baseadas em fontes oficiais reais.

FORMATO EXATO DE RESPOSTA
Sempre responda com:
1. Texto didático completo; divida em subtítulos se necessário.
2. Lista de referências ABNT ao final, apenas as fontes realmente usadas.
3. Nada mais além disso.
4. Texto puro, sem símbolos especiais, sem markdown, sem HTML, sem emojis.

INSTRUÇÃO FINAL AO MODELO
Seu objetivo é facilitar a vida do professor, criando material pronto para uso em aulas, atividades, provas ou apresentações. Use a base fornecida pelo professor como referência central. Se não houver base, crie o conteúdo a partir das fontes oficiais confiáveis. Explique sempre de forma leve, didática, direta e adequada para crianças e jovens.`;

const InputField: React.FC<{ label: string, required?: boolean, children: React.ReactNode, helperText?: string }> = ({ label, required, children, helperText }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {helperText && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 hc-text-secondary">{helperText}</p>}
    </div>
);

const SelectField: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode }> = ({ value, onChange, children }) => (
    <select value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
        {children}
    </select>
);

const MultiSelect: React.FC<{
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
}> = ({ options, selected, onChange, label }) => {
    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
            <div className="p-3 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map(option => (
                    <label key={option} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-600 rounded">
                        <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={() => toggleOption(option)}
                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 dark:bg-slate-600 dark:border-slate-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{option}</span>
                    </label>
                ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected.length === 0 ? 'Nenhum selecionado' : `${selected.length} selecionado(s)`}
            </p>
        </div>
    );
};

const BLOCK_CONFIG: { type: ModulePageContentType, label: string, icon: React.ReactNode }[] = [
    { type: 'title', label: 'Título', icon: ICONS.block_title },
    { type: 'paragraph', label: 'Parágrafo', icon: ICONS.block_paragraph },
    { type: 'list', label: 'Lista', icon: ICONS.block_list },
    { type: 'quote', label: 'Citação', icon: ICONS.block_quote },
    { type: 'image', label: 'Imagem', icon: ICONS.block_image },
    { type: 'video', label: 'Vídeo', icon: ICONS.block_video },
    { type: 'divider', label: 'Linha Divisória', icon: ICONS.block_divider },
];

const AlignmentControls: React.FC<{ onAlignChange: (align: 'left' | 'center' | 'right' | 'justify') => void; currentAlign?: string; }> = ({ onAlignChange, currentAlign }) => (
    <div className="flex items-center space-x-1">
        {(['left', 'center', 'right', 'justify'] as const).map(align => (
            <button
                key={align}
                type="button"
                onClick={() => onAlignChange(align)}
                className={`p-1.5 rounded-md transition-colors ${
                    currentAlign === align 
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-300' 
                        : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600'
                }`}
                aria-pressed={currentAlign === align}
                aria-label={`Alinhar ${align}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {align === 'left' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h16" />}
                    {align === 'center' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M7 14h10M4 18h16" />}
                    {align === 'right' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M10 14h10M4 18h16" />}
                    {align === 'justify' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />}
                </svg>
            </button>
        ))}
    </div>
);

const AdminCreateModule: React.FC = () => {
    const { user } = useAuth();
    const { handleSaveModule, handleUpdateModule, isSubmitting } = useAdminData();
    const { setCurrentPage, editingModule, exitEditingModule } = useNavigation();
    const { addToast } = useToast();

    // Metadata State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil');
    const [duration, setDuration] = useState('');
    
    // Multi-Select State
    const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    
    // Content State
    const [pages, setPages] = useState<ModulePage[]>([{ id: Date.now(), title: 'Página 1', content: [] }]);
    const [isLoadingContent, setIsLoadingContent] = useState(false);

    // AI Content Generation State
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiGenerationTarget, setAIGenerationTarget] = useState<{ pageId: number | null }>({ pageId: null });
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiBlockType, setAiBlockType] = useState<ModulePageContentType>('paragraph');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<string | string[] | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);

    useEffect(() => {
        if (editingModule) {
            setTitle(editingModule.title);
            setDescription(editingModule.description || '');
            setCoverImageUrl(editingModule.coverImageUrl || '');
            setVideoUrl(editingModule.videoUrl || '');
            setDifficulty(editingModule.difficulty || 'Fácil');
            setDuration(editingModule.duration || '');
            
            if (Array.isArray(editingModule.series)) {
                setSelectedSeries(editingModule.series);
            } else if (editingModule.series) {
                setSelectedSeries([editingModule.series]);
            }

            const subjects = editingModule.subjects || (editingModule.materia ? (Array.isArray(editingModule.materia) ? editingModule.materia : [editingModule.materia]) : []);
            setSelectedSubjects(subjects);

            const loadPages = async () => {
                if (editingModule.pages && editingModule.pages.length > 0) {
                    setPages(JSON.parse(JSON.stringify(editingModule.pages)));
                } else {
                    setIsLoadingContent(true);
                    try {
                        const docRef = doc(db, 'module_contents', editingModule.id);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists() && docSnap.data().pages) {
                            setPages(docSnap.data().pages);
                        } else {
                            setPages([{ id: Date.now(), title: 'Página 1', content: [] }]);
                        }
                    } catch (err: any) {
                        console.error("Error fetching module content:", err);
                        addToast("Erro ao carregar conteúdo do módulo.", "error");
                        setPages([{ id: Date.now(), title: 'Página 1', content: [] }]);
                    } finally {
                        setIsLoadingContent(false);
                    }
                }
            };
            loadPages();

        } else {
             setSelectedSeries([SCHOOL_YEARS[0]]);
             setSelectedSubjects(['História']);
             setPages([{ id: Date.now(), title: 'Página 1', content: [] }]);
        }
    }, [editingModule, addToast, user?.series]);

    const addPage = () => setPages(prev => [...prev, { id: Date.now(), title: `Página ${prev.length + 1}`, content: [] }]);
    
    const removePage = (pageId: number) => {
        if (pages.length > 1) {
            setPages(prev => prev.filter(p => p.id !== pageId).map((p, i) => ({ ...p, title: `Página ${i + 1}` })));
        }
    };

    const addBlock = (pageId: number, type: ModulePageContentType) => {
        const newBlock: ModulePageContent = type === 'list' 
            ? { type, content: ['Novo item'] }
            : type === 'divider'
            ? { type, content: '' }
            : type === 'image'
            ? { type, content: '', alt: '' }
            : type === 'video'
            ? { type, content: '' }
            : { type, content: '', align: 'left' };
        
        setPages(prev => prev.map(p => p.id === pageId ? { ...p, content: [...p.content, newBlock] } : p));
    };

    const updateBlock = (pageId: number, blockIndex: number, newValues: Partial<ModulePageContent>) => {
         setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                const newContent = [...p.content];
                newContent[blockIndex] = { ...newContent[blockIndex], ...newValues };
                return { ...p, content: newContent };
            }
            return p;
        }));
    };

    const removeBlock = (pageId: number, blockIndex: number) => {
        setPages(prev => prev.map(p => p.id === pageId ? { ...p, content: p.content.filter((_, i) => i !== blockIndex) } : p));
    };
    
    const moveBlock = (pageId: number, index: number, direction: 'up' | 'down') => {
        setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                const newContent = [...p.content];
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex >= 0 && targetIndex < newContent.length) {
                    [newContent[index], newContent[targetIndex]] = [newContent[targetIndex], newContent[index]];
                }
                return { ...p, content: newContent };
            }
            return p;
        }));
    };

    const openAIModal = (pageId: number) => {
        setAIGenerationTarget({ pageId });
        setIsAIModalOpen(true);
    };

    const closeAIModal = useCallback(() => {
        setIsAIModalOpen(false);
        setAIGenerationTarget({ pageId: null });
        setAiPrompt('');
        setAiBlockType('paragraph');
        setGeneratedContent(null);
        setGenerationError(null);
        setIsGenerating(false);
    }, []);

    const handleGenerateAIContent = async () => {
        if (!aiPrompt || isGenerating) return;
        setIsGenerating(true);
        setGeneratedContent(null);
        setGenerationError(null);
        
        try {
            // Use static import from top-level
            // @ts-ignore
            const apiKey = process.env.API_KEY as string;
            if (!apiKey) throw new Error("API Key não configurada.");

            const ai = new GoogleGenAI({ apiKey });
            const blockTypeLabel = BLOCK_CONFIG.find(b => b.type === aiBlockType)?.label || aiBlockType;
            const userPrompt = `Gere um conteúdo do tipo "${blockTypeLabel}" sobre o seguinte tópico: "${aiPrompt}". A resposta deve ser direta e pronta para ser usada em uma aula. - Se for uma lista, retorne cada item em uma nova linha, sem marcadores. - Se for um título, retorne apenas o texto do título. - Se for um parágrafo, retorne um texto coeso. - Se for uma citação, retorne apenas o texto da citação, sem aspas.`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: userPrompt,
              config: {
                systemInstruction: DIDACTIC_SYSTEM_PROMPT
              }
            });
            
            const text = response.text;
            if (!text) throw new Error("Resposta vazia da IA");

            if (aiBlockType === 'list') {
                setGeneratedContent(text.split('\n').filter(item => item.trim() !== ''));
            } else {
                setGeneratedContent(text);
            }
        } catch (error) {
            console.error("Error generating AI content:", error);
            setGenerationError("Não foi possível gerar o conteúdo. Verifique sua conexão e tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const addAIGeneratedContent = () => {
        if (!generatedContent || aiGenerationTarget.pageId === null) return;

        const newBlock: ModulePageContent = {
            type: aiBlockType,
            content: generatedContent,
            align: 'left',
        };

        setPages(prev => prev.map(p =>
            p.id === aiGenerationTarget.pageId ? { ...p, content: [...p.content, newBlock] } : p
        ));
        
        closeAIModal();
    };

    const handleSave = async () => {
        if (!title || selectedSeries.length === 0 || selectedSubjects.length === 0 || isSubmitting) {
            addToast("Preencha todos os campos obrigatórios (Título, Série e Matéria).", "error");
            return;
        }

        const moduleData: any = {
            title, description, coverImageUrl, videoUrl, difficulty, duration,
            pages,
            visibility: 'public',
            classIds: [],
            status: 'Ativo',
            series: selectedSeries,
            materia: selectedSubjects,
            subjects: selectedSubjects
        };

        if (editingModule) {
            await handleUpdateModule({ ...moduleData, id: editingModule.id, creatorId: editingModule.creatorId });
            exitEditingModule();
        } else {
            const success = await handleSaveModule({ ...moduleData, creatorId: user?.id });
            if (success) setCurrentPage('admin_modules');
        }
    };

    const handleCancel = () => {
        if (editingModule) exitEditingModule();
        else setCurrentPage('admin_modules');
    };

    if (isLoadingContent) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center space-y-4">
                    <SpinnerIcon className="h-12 w-12 text-indigo-600" />
                    <p className="text-slate-500">Carregando conteúdo do módulo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {isAIModalOpen && (
                <Modal isOpen={isAIModalOpen} onClose={closeAIModal} title="Gerar Conteúdo com IA (Admin)">
                    <div className="space-y-4">
                        <InputField label="Descreva o conteúdo que você deseja criar" required>
                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                rows={4}
                                placeholder="Ex: um resumo sobre a Revolução Industrial para o 8º ano"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                autoFocus
                            />
                        </InputField>
                         <InputField label="Tipo de Bloco" required>
                             <select
                                 value={aiBlockType}
                                 onChange={e => setAiBlockType(e.target.value as ModulePageContentType)}
                                 className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                             >
                                 {BLOCK_CONFIG.filter(b => !['image', 'video', 'divider'].includes(b.type)).map(config => (
                                     <option key={config.type} value={config.type}>{config.label}</option>
                                 ))}
                            </select>
                        </InputField>
                        <button
                            onClick={handleGenerateAIContent}
                            disabled={!aiPrompt.trim() || isGenerating}
                            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override"
                        >
                            {isGenerating ? <SpinnerIcon className="h-5 w-5 text-indigo-900 dark:text-white" /> : <div className="h-5 w-5">{ICONS.ai_generate}</div>}
                            <span className="ml-2">{isGenerating ? 'Gerando...' : 'Gerar'}</span>
                        </button>

                        {generationError && <p className="text-sm text-red-500 text-center">{generationError}</p>}
                        
                        {generatedContent && (
                            <div className="mt-4 p-4 border-t dark:border-slate-700 space-y-4">
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200">Conteúdo Gerado:</h4>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md max-h-48 overflow-y-auto border dark:border-slate-600">
                                    {Array.isArray(generatedContent) ? (
                                        <ul className="list-disc list-inside">
                                            {generatedContent.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{generatedContent}</p>
                                    )}
                                </div>
                                <button onClick={addAIGeneratedContent} className="w-full flex items-center justify-center px-4 py-2 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40 hc-button-primary-override">
                                    Adicionar ao Módulo
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            <div className="flex justify-between items-center">
                 <div>
                     <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">
                        {editingModule ? 'Editar Módulo (Admin)' : 'Criar Módulo (Admin)'}
                    </h2>
                     <p className="text-slate-500 dark:text-slate-400 mt-1">Modo Administrador: Múltiplas séries e matérias.</p>
                </div>
                <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hc-button-override">Voltar</button>
            </div>

            <Card>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6">Informações do Módulo</h3>
                <div className="space-y-6">
                    <InputField label="Título" required>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>
                    <InputField label="Descrição">
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>
                    <InputField label="Imagem de Capa (URL)">
                        <input type="text" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MultiSelect 
                            label="Séries (Multi-seleção)" 
                            options={SCHOOL_YEARS} 
                            selected={selectedSeries} 
                            onChange={setSelectedSeries} 
                        />
                        <MultiSelect 
                            label="Matérias (Multi-seleção)" 
                            options={ADMIN_SUBJECTS} 
                            selected={selectedSubjects} 
                            onChange={setSelectedSubjects} 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputField label="Dificuldade" required>
                             <SelectField value={difficulty} onChange={e => setDifficulty(e.target.value as any)}><option>Fácil</option><option>Médio</option><option>Difícil</option></SelectField>
                         </InputField>
                         <InputField label="Duração">
                             <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                         </InputField>
                    </div>
                </div>
            </Card>

            <Card>
                 <div className="flex justify-between items-center border-b dark:border-slate-700 pb-4 mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Conteúdo</h3>
                    <button onClick={addPage} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hc-button-override">Nova Página</button>
                </div>
                
                <div className="space-y-8">
                    {pages.map((page, pageIndex) => (
                        <div key={page.id} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-700 dark:text-slate-200">{page.title}</h4>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => openAIModal(page.id)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 mr-2 flex items-center">
                                        <div className="h-3 w-3 mr-1">{ICONS.ai_generate}</div> IA
                                    </button>
                                    <button onClick={() => removePage(page.id)} disabled={pages.length === 1} className="text-red-500 hover:text-red-700 disabled:opacity-30">Excluir Página</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {page.content.map((block, blockIndex) => {
                                    const inputClasses = "w-full p-2 border-gray-300 rounded-md bg-white text-black dark:bg-slate-800 dark:border-slate-600 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500";
                                    const alignMap: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' };
                                    const alignClass = block.align ? alignMap[block.align] : 'text-left';
                                    const hasAlignment = block.type === 'title' || block.type === 'paragraph';

                                    return (
                                        <div key={blockIndex} className="p-4 bg-white dark:bg-slate-800 border rounded-lg relative group dark:border-slate-700 shadow-sm">
                                            <div className="space-y-2">
                                                {block.type === 'title' && <input type="text" placeholder="Título" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} className={`${inputClasses} text-2xl font-bold ${alignClass}`} />}
                                                {block.type === 'paragraph' && <textarea placeholder="Parágrafo" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} rows={4} className={`${inputClasses} ${alignClass}`} />}
                                                {block.type === 'list' && <textarea placeholder="Um item por linha" value={(block.content as string[]).join('\n')} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value.split('\n') })} rows={4} className={inputClasses} />}
                                                {block.type === 'quote' && <textarea placeholder="Citação" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} rows={2} className={`${inputClasses} italic`} />}
                                                {block.type === 'image' && (
                                                    <div className="space-y-2">
                                                        <input type="text" placeholder="URL da Imagem" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} className={inputClasses} />
                                                        <input type="text" placeholder="Descrição da Imagem" value={block.alt || ''} onChange={e => updateBlock(page.id, blockIndex, { alt: e.target.value })} className={inputClasses} />
                                                    </div>
                                                )}
                                                {block.type === 'video' && <input type="text" placeholder="URL do Vídeo (YouTube)" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} className={inputClasses} />}
                                                {block.type === 'divider' && <div className="w-full h-px bg-slate-300 dark:bg-slate-600 my-4" />}
                                                
                                                {hasAlignment && (
                                                    <div className="pt-2">
                                                        <AlignmentControls 
                                                            onAlignChange={(align) => updateBlock(page.id, blockIndex, { align })} 
                                                            currentAlign={block.align} 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button type="button" onClick={() => moveBlock(page.id, blockIndex, 'up')} disabled={blockIndex === 0} className="p-1.5 bg-slate-100 border rounded-md shadow-sm disabled:opacity-30 dark:bg-slate-700 dark:border-slate-600 hover:bg-slate-200">↑</button>
                                                <button type="button" onClick={() => moveBlock(page.id, blockIndex, 'down')} disabled={blockIndex === page.content.length - 1} className="p-1.5 bg-slate-100 border rounded-md shadow-sm disabled:opacity-30 dark:bg-slate-700 dark:border-slate-600 hover:bg-slate-200">↓</button>
                                                <button type="button" onClick={() => removeBlock(page.id, blockIndex)} className="p-1.5 bg-red-100 text-red-600 border border-red-200 rounded-md shadow-sm hover:bg-red-200">×</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                                {BLOCK_CONFIG.map(block => (
                                    <button
                                        key={block.type}
                                        onClick={() => addBlock(page.id, block.type)}
                                        className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors shadow-sm"
                                    >
                                        <div className="text-indigo-500 dark:text-indigo-400 mb-1">{block.icon}</div>
                                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{block.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="flex justify-end space-x-4 pb-8">
                <button 
                    onClick={handleCancel} 
                    className="px-6 py-2 bg-white text-slate-700 font-semibold rounded-lg hover:bg-slate-50 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 shadow-lg disabled:opacity-50 flex items-center space-x-2 hc-button-primary-override"
                >
                     {isSubmitting ? <SpinnerIcon className="h-5 w-5 text-white" /> : <div className="h-5 w-5">{ICONS.plus}</div>}
                    <span>{editingModule ? 'Salvar Alterações' : 'Criar Módulo'}</span>
                </button>
            </div>
        </div>
    );
};

export default AdminCreateModule;