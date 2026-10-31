// Light/dark theme, remembered per browser. index.html applies the saved theme before React loads,
// so the page doesn't flash light on reload.
const KEY = 'spendboard-theme';

export function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked (private mode etc.): the theme still applies for this visit
  }
}
