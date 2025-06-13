import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Theme configuration
export const themes = {
  dark: {
    background: '#0f0f0f',
    cardBackground: '#1f1f1f',
    inputBackground: '#2a2a2a',
    inputText: '#ffffff',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    primary: '#FF383A',
    primaryHover: '#E62D31',
    navSelected: '#FF383A',
    navUnselected: '#a0a0a0',
  },
  light: {
    background: '#f7f7f7',
    cardBackground: '#DDDDDD',
    inputBackground: '#C3C3C3',
    inputText: '#4E4E4E',
    text: '#000000',
    textSecondary: '#4E4E4E',
    primary: '#FF383A',
    primaryHover: '#E62D31',
    navSelected: '#FF383A',
    navUnselected: '#C3C3C3',
  },
};

export const getThemeColors = (theme: Theme) => themes[theme];