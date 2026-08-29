import { onMounted, readonly, ref } from 'vue';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'information-desk:theme';
/** Matches `darkModeSelector` in the PrimeVue theme config in main.ts. */
const DARK_CLASS = 'app-dark';

const mode = ref<ThemeMode>('light');

function apply(next: ThemeMode): void {
  mode.value = next;
  document.documentElement.classList.toggle(DARK_CLASS, next === 'dark');
  document.documentElement.style.colorScheme = next;
}

function readStoredMode(): ThemeMode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : null;
  } catch {
    // Private browsing or blocked storage — fall back to the OS preference.
    return null;
  }
}

/**
 * Theme preference, persisted to localStorage. With nothing stored we follow
 * the operating system, which is what most people expect on a first visit.
 */
export function useTheme() {
  onMounted(() => {
    const stored = readStoredMode();
    if (stored) {
      apply(stored);
      return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    apply(prefersDark ? 'dark' : 'light');
  });

  function setMode(next: ThemeMode): void {
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference simply will not persist; the page still works.
    }
  }

  function toggle(): void {
    setMode(mode.value === 'dark' ? 'light' : 'dark');
  }

  return { mode: readonly(mode), setMode, toggle };
}
