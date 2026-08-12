import React, { createContext, useState, useEffect, useContext } from 'react';

export const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const themes = [
  {
    id: 'midnight-slate',
    name: 'Midnight Slate',
    colors: ['#0f172a', '#1e293b', '#8b5cf6', '#10b981'],
    type: 'dark'
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    colors: ['#f0f8ff', '#ffffff', '#1a3f75', '#44e6a9'],
    type: 'light'
  },
  {
    id: 'starlight-galaxy',
    name: 'Starlight Galaxy',
    colors: ['#040b16', '#0a192f', '#00f2fe', '#4facfe'],
    type: 'dark'
  },
  {
    id: 'ocean-mist',
    name: 'Ocean Mist',
    colors: ['#0e1d21', '#122e34', '#677e8a', '#abafb5'],
    type: 'dark'
  },
  {
    id: 'eclipse-noir',
    name: 'Eclipse Noir',
    colors: ['#000000', '#0f0f0f', '#ffffff', '#969696'],
    type: 'dark'
  },
  {
    id: 'obsidian-matrix',
    name: 'Obsidian Matrix',
    colors: ['#09090b', '#18181b', '#a855f7', '#ec4899'],
    type: 'dark'
  }
];

export const ThemeProvider = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState(() => {
    const savedTheme = localStorage.getItem('eduverse_theme');
    return savedTheme || 'midnight-slate';
  });

  useEffect(() => {
    // Apply theme to document element for global CSS variables
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('eduverse_theme', activeTheme);
  }, [activeTheme]);

  const switchTheme = (themeId) => {
    setActiveTheme(themeId);
  };

  return (
    <ThemeContext.Provider value={{ activeTheme, switchTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};
