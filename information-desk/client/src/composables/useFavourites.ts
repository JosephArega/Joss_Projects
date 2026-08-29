import { computed, ref } from 'vue';

const STORAGE_KEY = 'information-desk:favourites';

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// Module-level so the header strip and the grid always agree.
const ids = ref<string[]>(read());

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.value));
  } catch {
    // Nothing to do — favourites just will not survive a reload.
  }
}

/** Per-browser pinned services. Never leaves the device. */
export function useFavourites() {
  const favouriteIds = computed(() => ids.value);
  const count = computed(() => ids.value.length);

  const isFavourite = (id: string) => ids.value.includes(id);

  function toggle(id: string): boolean {
    const next = isFavourite(id) ? ids.value.filter((value) => value !== id) : [...ids.value, id];
    ids.value = next;
    persist();
    return isFavourite(id);
  }

  /** Drops ids that no longer exist, so deleted services do not linger. */
  function reconcile(existingIds: readonly string[]): void {
    const existing = new Set(existingIds);
    const filtered = ids.value.filter((id) => existing.has(id));
    if (filtered.length !== ids.value.length) {
      ids.value = filtered;
      persist();
    }
  }

  return { favouriteIds, count, isFavourite, toggle, reconcile };
}
