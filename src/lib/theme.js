/**
 * Roommate Chore Manager — Theme Management Engine
 * Handles Light, Dark, and System theme preferences with class-based Tailwind support.
 */

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

const THEME_KEY = 'roommate_chore_theme';

export function getStoredTheme() {
  if (typeof window === 'undefined') return THEMES.SYSTEM;
  return localStorage.getItem(THEME_KEY) || THEMES.SYSTEM;
}

export function applyTheme(theme = getStoredTheme()) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  let isDark = false;

  if (theme === THEMES.DARK) {
    isDark = true;
  } else if (theme === THEMES.LIGHT) {
    isDark = false;
  } else {
    // SYSTEM PREFERENCE
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function setStoredTheme(theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

// Subscribe to system preference changes when in SYSTEM mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === THEMES.SYSTEM) {
      applyTheme(THEMES.SYSTEM);
    }
  });
}

// Inline script to execute in <head> before render to prevent theme flash
export const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('${THEME_KEY}') || '${THEMES.SYSTEM}';
    var isDark = false;
    if (theme === '${THEMES.DARK}') {
      isDark = true;
    } else if (theme === '${THEMES.LIGHT}') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;
