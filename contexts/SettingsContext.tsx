
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'high-contrast' | 'mn' | 'emerald-sovereignty' | 'galactic-aurora' | 'dragon-year' | 'morning-tide' | 'akebono-dawn' | 'itoshi-sae' | 'sorcerer-supreme' | 'midnight';

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isHighContrastText: boolean;
    setIsHighContrastText: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// FIX: Refactored the provider component to a standard function declaration to resolve errors where the 'children' prop was not being correctly recognized by the type system.
export function SettingsProvider({ children }: { children?: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');
    const [isHighContrastText, setIsHighContrastText] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme | null;
        // Cleanup for removed themes logic if user had them selected
        if (savedTheme && savedTheme !== 'sepia' as any && savedTheme !== 'samurai-honor' as any && savedTheme !== 'arcane-copper' as any && savedTheme !== 'maasai-culture' as any && savedTheme !== 'final-judgment' as any && savedTheme !== 'kaiser-impact' as any) { 
            setTheme(savedTheme);
        } else if (savedTheme === 'sepia' as any || savedTheme === 'samurai-honor' as any || savedTheme === 'arcane-copper' as any || savedTheme === 'maasai-culture' as any || savedTheme === 'final-judgment' as any || savedTheme === 'kaiser-impact' as any) {
            setTheme('dragon-year'); // Default fallback
        }
        const savedHighContrastText = localStorage.getItem('app-high-contrast-text') === 'true';
        setIsHighContrastText(savedHighContrastText);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'high-contrast', 'sepia', 'mn', 'emerald-sovereignty', 'galactic-aurora', 'dragon-year', 'maasai-culture', 'samurai-honor', 'morning-tide', 'arcane-copper', 'akebono-dawn', 'final-judgment', 'itoshi-sae', 'sorcerer-supreme', 'midnight', 'kaiser-impact');
        root.classList.add(theme);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        if (isHighContrastText) {
            root.classList.add('high-contrast-text');
        } else {
            root.classList.remove('high-contrast-text');
        }
        localStorage.setItem('app-high-contrast-text', String(isHighContrastText));
    }, [isHighContrastText]);

    const value = { theme, setTheme, isHighContrastText, setIsHighContrastText };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
