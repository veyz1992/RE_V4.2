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
                className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] relative overflow-hidden"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
                <div className="relative w-5 h-5">
                    <SunIcon 
                        className={`w-5 h-5 absolute transition-all duration-250 ease-out ${
                            theme === 'light' 
                                ? 'opacity-0 translate-x-full' 
                                : 'opacity-100 translate-x-0'
                        }`} 
                    />
                    <MoonIcon 
                        className={`w-5 h-5 absolute transition-all duration-250 ease-out ${
                            theme === 'light' 
                                ? 'opacity-100 translate-x-0' 
                                : 'opacity-0 -translate-x-full'
                        }`} 
                    />
                </div>
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
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-all duration-250 ease-out ${theme === 'light' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                    >
                        <SunIcon className={`w-4 h-4 transition-all duration-250 ease-out ${theme === 'light' ? 'opacity-100 scale-100' : 'opacity-70 scale-90'}`} /> Light
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-all duration-250 ease-out ${theme === 'dark' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                    >
                        <MoonIcon className={`w-4 h-4 transition-all duration-250 ease-out ${theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-70 scale-90'}`} /> Dark
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default ThemeToggle;
