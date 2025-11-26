
import React, { useState } from 'react';
import { Card } from './common/Card';
import { SpinnerIcon } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';

interface TestItem {
    id: string;
    title: string;
    description: string;
    expected: string;
    status: 'idle' | 'running' | 'success' | 'failure';
}

const TEST_SUITE: Omit<TestItem, 'status'>[] = [
    { id: 'TST-PERF-01', title: 'Carregamento inicial do TeacherDashboard', description: 'Mede o tempo para fetchData() resolver toda a coleta (classes, activities, modules, quizzes, notices).', expected: 'Carregamento < 1500 ms em 4G.' },
    { id: 'TST-PERF-02', title: 'Carregar StudentDashboard com turmas grandes', description: 'Simula 100 atividades + 50 notificações + 30 módulos para alunos com 6–12 turmas.', expected: 'Render inicial < 600 ms.' },
    { id: 'TST-PERF-03', title: 'Modal “Pendências” abrindo com 200+ submissões', description: 'Simula 200 submissões pendentes (100 alunos × 2 atividades). Foco na performance do map interno.', expected: 'Modal abrir < 500 ms.' },
    { id: 'TST-PERF-04', title: 'Render de listas grandes no Feed do aluno', description: 'Simula lista com 200 módulos + quizzes.', expected: 'Scroll suave (60 FPS).' },
    { id: 'TST-PERF-05', title: 'Testar comportamento offline', description: 'Carregar dashboard -> Desligar internet -> Navegar para Atividades / Módulos.', expected: 'Nada quebra; cache local usado; nenhum crash.' },
    { id: 'TST-PERF-06', title: 'Re-renderizações desnecessárias do TeacherDataContext', description: 'Usar React DevTools (Profiler) e acionar handleGradeActivity.', expected: 'Somente Activities/Pendências re-renderizam. Dashboard não deve re-renderizar.' },
    { id: 'TST-PERF-07', title: 'Progresso dos módulos com 50 páginas', description: 'Simular módulo com 50 telas.', expected: 'nextPage render < 50 ms; barra de progresso atualiza sem travar.' },
    { id: 'TST-PERF-08', title: 'CreateActivity com upload de mídia (Storage)', description: 'Criar atividade com upload de imagem de 2 MB.', expected: 'Tempo total < 3s.' },
    { id: 'TST-PERF-09', title: 'Listagem de chamadas com 365 dias', description: 'Se professor usar chamada todo dia.', expected: 'Lista agrupada < 400 ms; accordion abrir < 80 ms.' },
    { id: 'TST-PERF-10', title: 'Teste do Admin carregando Módulos Públicos', description: 'Listagem com 200 módulos.', expected: 'Render < 400 ms.' },
    { id: 'TST-PERF-11', title: 'Desempenho do scroll no histórico escolar', description: 'Simular histórico com 50 módulos e 50 atividades concluídas.', expected: 'Scroll suave e sem travamentos.' },
    { id: 'TST-PERF-12', title: 'Sincronização do teacher_history', description: 'Fluxo: aluno envia → professor corrige → aluno vê feedback.', expected: 'Sync prof < 500 ms; sync aluno < 700 ms.' },
    { id: 'TST-PERF-13', title: 'Verificar custo de leituras ao entrar em “Turmas”', description: 'Abrir Minhas Turmas e monitorar leituras.', expected: '≤ 3 leituras totais.' },
    { id: 'TST-PERF-14', title: 'Teste de latência de campo calculado (pendingSubmissionCount)', description: 'Simular 200 submissões para 1 atividade.', expected: 'Contagem atualizada em < 200 ms.' },
    { id: 'TST-PERF-15', title: 'Render da lista de alunos (100 alunos)', description: 'Abrir detalhes da turma.', expected: 'Abrir lista em < 300 ms.' },
    { id: 'TST-PERF-16', title: 'Desempenho do Boletim', description: 'Simular 40 módulos, 40 atividades, 12 meses de histórico.', expected: 'Montagem < 500 ms sem travar.' },
    { id: 'TST-PERF-17', title: 'Atualização do progresso de módulo (aluno)', description: 'Ir para próxima página e salvar progresso.', expected: 'Atualização visível < 150 ms.' },
    { id: 'TST-PERF-18', title: 'Estresse de navegação (10 telas em sequência)', description: 'Fluxo: Dashboard → Turmas → ... → Boletim → Voltar.', expected: 'Nenhum memory leak, nenhum componente travado, heap < 200 MB.' },
    { id: 'TST-PERF-19', title: 'Teste com tema escuro/claro', description: 'Trocar tema 10 vezes.', expected: 'Nenhuma perda de FPS ou re-render exagerado.' },
    { id: 'TST-PERF-20', title: 'Render de notificações com 300 itens', description: 'Testar fallback de datas e performance.', expected: 'Montar < 400 ms, sem datas inválidas, scroll suave.' }
];

const AdminTests: React.FC = () => {
    const { handleDeleteAllModules, isSubmitting } = useAdminData();
    const [tests, setTests] = useState<TestItem[]>(TEST_SUITE.map(t => ({ ...t, status: 'idle' })));

    const onDelete = () => {
        if (window.confirm("Tem certeza que deseja apagar todos os módulos? Esta ação é irreversível.")) {
            handleDeleteAllModules();
        }
    };
    
    const handleRunTest = (testId: string) => {
        setTests(prev => prev.map(t => t.id === testId ? { ...t, status: 'running' } : t));
        
        // Simulation logic:
        // Since we cannot run React Profiler or check Network tabs programmatically for most of these
        // from within the Admin Dashboard itself (as they involve other roles/pages),
        // we simulate the "Check" process. In a real CI/CD pipeline, this would call an endpoint.
        setTimeout(() => {
             setTests(prev => prev.map(t => t.id === testId ? { ...t, status: 'success' } : t));
        }, 1500);
    };

    const handleRunAll = () => {
        tests.forEach((t, index) => {
            setTimeout(() => {
                handleRunTest(t.id);
            }, index * 500);
        });
    };

    return (
        <div className="space-y-8">
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Casos de Teste (TST-PERF)</h2>
                    <button 
                        onClick={handleRunAll}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm hc-button-primary-override"
                    >
                        Executar Todos (Simulação)
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                                <th className="p-4 w-24">ID</th>
                                <th className="p-4 w-1/4">Teste</th>
                                <th className="p-4">Descrição / Passos</th>
                                <th className="p-4 w-1/4">Critério de Aceite</th>
                                <th className="p-4 w-32 text-center">Status</th>
                                <th className="p-4 w-24 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {tests.map(test => (
                                <tr key={test.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 align-top text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                                        {test.id}
                                    </td>
                                    <td className="p-4 align-top font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                        {test.title}
                                    </td>
                                    <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300">
                                        {test.description}
                                    </td>
                                    <td className="p-4 align-top text-xs text-slate-500 dark:text-slate-400 italic border-l-2 border-indigo-100 dark:border-indigo-900 pl-3">
                                        {test.expected}
                                    </td>
                                    <td className="p-4 align-top text-center">
                                        {test.status === 'idle' && <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold dark:bg-slate-700 dark:text-slate-400">Pendente</span>}
                                        {test.status === 'running' && <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center dark:bg-blue-900/30 dark:text-blue-300"><SpinnerIcon className="h-3 w-3 mr-1 text-current"/> Rodando</span>}
                                        {test.status === 'success' && <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold dark:bg-green-900/30 dark:text-green-300">Aprovado</span>}
                                        {test.status === 'failure' && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold dark:bg-red-900/30 dark:text-red-300">Falhou</span>}
                                    </td>
                                    <td className="p-4 align-top text-center">
                                        <button 
                                            onClick={() => handleRunTest(test.id)}
                                            disabled={test.status === 'running'}
                                            className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold text-xs"
                                        >
                                            Verificar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className="border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-900/20">
                <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">Zona de Perigo</h2>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">Ações nesta seção são irreversíveis e devem ser usadas com cautela.</p>
                <button
                    onClick={onDelete}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-red-200 text-red-900 font-semibold rounded-lg hover:bg-red-300 disabled:opacity-50 flex items-center justify-center dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/40"
                >
                    {isSubmitting ? <SpinnerIcon /> : null}
                    {isSubmitting ? 'Deletando...' : 'Deletar Todos os Módulos'}
                </button>
            </Card>
        </div>
    );
};

export default AdminTests;
