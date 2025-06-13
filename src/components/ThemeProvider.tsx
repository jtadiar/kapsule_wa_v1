import React, { useEffect } from 'react';
import { useThemeStore, getThemeColors } from '../store/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme } = useThemeStore();
  const themeColors = getThemeColors(theme);

  useEffect(() => {
    // Apply theme colors to CSS custom properties
    const root = document.documentElement;
    
    root.style.setProperty('--theme-background', themeColors.background);
    root.style.setProperty('--theme-card-background', themeColors.cardBackground);
    root.style.setProperty('--theme-input-background', themeColors.inputBackground);
    root.style.setProperty('--theme-input-text', themeColors.inputText);
    root.style.setProperty('--theme-text', themeColors.text);
    root.style.setProperty('--theme-text-secondary', themeColors.textSecondary);
    root.style.setProperty('--theme-primary', themeColors.primary);
    root.style.setProperty('--theme-primary-hover', themeColors.primaryHover);
    root.style.setProperty('--theme-nav-selected', themeColors.navSelected);
    root.style.setProperty('--theme-nav-unselected', themeColors.navUnselected);

    // Apply background color to body
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color = themeColors.text;
  }, [theme, themeColors]);

  return <>{children}</>;
};

export default ThemeProvider;