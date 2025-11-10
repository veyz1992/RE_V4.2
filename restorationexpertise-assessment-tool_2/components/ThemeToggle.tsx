import React from 'react';
import { useTheme } from './ThemeContext';
import { SunIcon, MoonIcon } from './icons';

interface ThemeToggleProps {
    variant: 'icon' | 'row';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant }) => {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    if (variant === 'icon') {
        return (
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
        );
    }

    if (variant === 'row') {
        return (
            <div className="px-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Appearance</p>
                <div className="flex bg-[var(--bg-subtle)] p-1 rounded-lg">
                    <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors ${theme === 'light' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                    >
                        <SunIcon className="w-4 h-4" /> Light
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                    >
                        <MoonIcon className="w-4 h-4" /> Dark
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default ThemeToggle;
