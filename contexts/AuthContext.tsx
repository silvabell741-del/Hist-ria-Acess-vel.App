

import React, { createContext, useState, useCallback, useContext, ReactNode, useEffect } from 'react';
import type { Role, User } from '../types';
import { auth, db } from '../components/firebaseClient';
import { 
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    User as FirebaseUser,
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';


type AuthState = 'unauthenticated' | 'authenticated' | 'loading';

interface AuthContextType {
    authState: AuthState;
    user: User | null;
    userRole: Role;
    authError: string | null;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    handleLogout: () => void;
    updateUser: (updatedData: Partial<User>) => Promise<void>;
    createUserProfile: (role: Role, series?: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// FIX: Refactored the provider component to a standard function declaration to resolve errors where the 'children' prop was not being correctly recognized by the type system.
export function AuthProvider({ children }: { children?: ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>('loading');
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    // This function ensures the teacher_history document exists for a professor.
    const ensureTeacherHistoryDoc = async (firebaseUser: FirebaseUser) => {
        const historyRef = doc(db, "teacher_history", firebaseUser.uid);
        const snap = await getDoc(historyRef);

        if (!snap.exists()) {
            await setDoc(historyRef, {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || "",
                email: firebaseUser.email || "",
                photoURL: firebaseUser.photoURL || "",
                classes: [],
                notifications: [],
                attendanceSessions: []
            });
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthError(null);
            if (user) {
                setFirebaseUser(user);
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(userDocRef);

                    if (docSnap.exists()) {
                        const profile = docSnap.data();
                        const appUser: User = {
                            id: user.uid,
                            name: profile.name,
                            email: user.email!,
                            role: profile.role,
                            series: profile.series,
                        };
                        setUser(appUser);
                        setAuthState('authenticated');

                        // Ensure teacher history exists for existing professors
                        if (appUser.role === 'professor') {
                            await ensureTeacherHistoryDoc(user);
                        }

                    } else {
                        // Profile doesn't exist, start onboarding
                        const partialUser: User = {
                            id: user.uid,
                            name: user.displayName || user.email || '',
                            email: user.email!,
                            role: null,
                        };
                        setUser(partialUser);
                        setAuthState('authenticated');
                    }
                } catch (error: any) {
                    console.error("Firebase Error:", error);
                    let errorMessage = `Ocorreu um erro ao carregar seu perfil: ${error.message}.`;
                     if (error.code === 'permission-denied') {
                        errorMessage = `Erro Crítico de Configuração: Permissão negada para acessar os perfis de usuário.\n\nCausa Provável: As Regras de Segurança (Security Rules) do seu Firestore não permitem que usuários leiam seus próprios perfis.\n\nSolução:\n1. Vá para o seu console do Firebase -> Firestore Database -> Rules.\n2. Adicione a seguinte regra para permitir a leitura e escrita do próprio perfil:\n\nmatch /users/{userId} {\n  allow read, update, create: if request.auth != null && request.auth.uid == userId;\n}`;
                    }
                    setAuthError(errorMessage);
                    await signOut(auth); // Log out user on profile error
                }
            } else {
                setUser(null);
                setFirebaseUser(null);
                setAuthState('unauthenticated');
            }
        });

        return () => unsubscribe();
    }, []);

    const handleFirebaseError = (error: any): string => {
        console.error("Firebase Auth Error:", error.code, error.message);
        switch (error.code) {
            case 'auth/wrong-password':
                return 'Senha incorreta. Por favor, tente novamente.';
            case 'auth/user-not-found':
                return 'Nenhum usuário encontrado com este email.';
            case 'auth/email-already-in-use':
                return 'Este email já está em uso por outra conta.';
            case 'auth/weak-password':
                return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
            case 'auth/popup-closed-by-user':
                return 'Login com Google cancelado.';
            case 'auth/missing-email':
                return 'O email é obrigatório.';
            case 'auth/invalid-email':
                return 'O formato do email é inválido.';
            default:
                return `Ocorreu um erro: ${error.message}`;
        }
    };
    
    const signInWithEmail = async (email: string, pass: string) => {
        setAuthError(null);
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch(error) {
            const message = handleFirebaseError(error);
            setAuthError(message);
            throw new Error(message);
        }
    };
    
    const signUpWithEmail = async (name: string, email: string, pass: string) => {
        setAuthError(null);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(userCredential.user, { displayName: name });
            // The onAuthStateChanged listener will handle the rest
        } catch(error) {
            const message = handleFirebaseError(error);
            setAuthError(message);
            throw new Error(message);
        }
    };

    const resetPassword = useCallback(async (email: string) => {
        setAuthError(null);
        try {
            await sendPasswordResetEmail(auth, email);
        } catch(error) {
             const message = handleFirebaseError(error);
             setAuthError(message);
             throw new Error(message);
        }
    }, []);

    const signInWithGoogle = async () => {
        setAuthError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            const message = handleFirebaseError(error);
            setAuthError(message);
            throw new Error(message);
        }
    };

    const handleLogout = useCallback(async () => {
        await signOut(auth);
    }, []);

    const updateUser = useCallback(async (updatedData: Partial<User>) => {
        if (!user) return;
        
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, { name: updatedData.name, series: updatedData.series });

        // Update local state immediately
        setUser(prev => prev ? { ...prev, ...updatedData } : null);

    }, [user]);

    const createUserProfile = useCallback(async (role: Role, series?: string) => {
        if (!firebaseUser) {
            throw new Error("Usuário não autenticado ou função não fornecida para criar perfil.");
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const userProfile: { 
            name: string | null; 
            email: string | null; 
            role: Role; 
            series?: string;
        } = {
            name: firebaseUser.displayName || firebaseUser.email,
            email: firebaseUser.email,
            role: role,
        };

        if (series) {
            userProfile.series = series;
        }

        try {
            await setDoc(userDocRef, userProfile);
            
            // Ensure teacher history is created for new professors
            if (role === 'professor') {
                await ensureTeacherHistoryDoc(firebaseUser);
            }

            const appUser: User = {
                id: firebaseUser.uid,
                name: userProfile.name!,
                email: userProfile.email!,
                role: userProfile.role,
                series: userProfile.series,
            };
            setUser(appUser); // Update local state to trigger rerender
        } catch(error: any) {
            console.error("Error creating profile in Firestore:", error);
            throw error;
        }
    }, [firebaseUser]);

    const value: AuthContextType = { 
        authState, 
        user, 
        userRole: user?.role ?? null, 
        authError,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        handleLogout,
        updateUser,
        createUserProfile,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};