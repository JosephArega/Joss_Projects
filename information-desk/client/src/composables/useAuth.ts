import { computed, ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type { Admin } from '@/api/types';

const admin = ref<Admin | null>(null);
const checked = ref(false);

/**
 * Session state shared across the admin views. The JWT itself is in an
 * httpOnly cookie — this only mirrors who the server says we are.
 */
export function useAuth() {
  const isAuthenticated = computed(() => admin.value !== null);
  const mustChangePassword = computed(() => admin.value?.mustChangePassword === true);

  function setAdmin(next: Admin | null): void {
    admin.value = next;
    checked.value = true;
  }

  /** Asks the server who we are. Returns null when the session is gone. */
  async function refresh(): Promise<Admin | null> {
    try {
      const { admin: current } = await api.me();
      setAdmin(current);
      return current;
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setAdmin(null);
        return null;
      }
      // A network blip should not silently sign the user out.
      checked.value = true;
      throw error;
    }
  }

  async function login(username: string, password: string): Promise<Admin> {
    const { admin: current } = await api.login(username, password);
    setAdmin(current);
    return current;
  }

  async function logout(): Promise<void> {
    try {
      await api.logout();
    } finally {
      setAdmin(null);
    }
  }

  /** Clears local state without calling the server (used on a 401). */
  function clear(): void {
    setAdmin(null);
  }

  return {
    admin: computed(() => admin.value),
    checked: computed(() => checked.value),
    isAuthenticated,
    mustChangePassword,
    setAdmin,
    refresh,
    login,
    logout,
    clear,
  };
}
