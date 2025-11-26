
import React from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';

const AdminManageUsers: React.FC = () => {
    return (
        <div className="space-y-8">
            <Card className="p-8 text-center border-l-4 border-l-yellow-500">
                <div className="inline-block p-4 rounded-full bg-yellow-100 text-yellow-600 mb-4 dark:bg-yellow-900/30 dark:text-yellow-400">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Acesso Restrito</h2>
                <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
                    Por razões de segurança e performance, o gerenciamento direto de usuários, permissões e dados sensíveis foi movido exclusivamente para o <strong>Firebase Console</strong>.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                    Utilize o painel de autenticação do Firebase para criar, desativar ou alterar senhas de usuários.
                </p>
            </Card>
        </div>
    );
};

export default AdminManageUsers;
