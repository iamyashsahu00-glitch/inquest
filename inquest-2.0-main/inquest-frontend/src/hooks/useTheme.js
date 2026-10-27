import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('inquest_theme', 'light');
    }
  }, []);

  const toggleTheme = () => {};

  return { theme, toggleTheme, setTheme };
}
