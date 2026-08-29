<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import Tabs from 'primevue/tabs';

import AppLogo from '@/components/AppLogo.vue';
import PortalFooter from '@/components/PortalFooter.vue';
import ServiceCard from '@/components/ServiceCard.vue';
import ServiceGridSkeleton from '@/components/ServiceGridSkeleton.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { api } from '@/api/client';
import type { Category, Organization, Service } from '@/api/types';
import { useFavourites } from '@/composables/useFavourites';

const ALL_TAB = 'all';

const loading = ref(true);
const loadError = ref<string | null>(null);
const organization = ref<Organization | null>(null);
const lastUpdated = ref<string | null>(null);
const categories = ref<Category[]>([]);
const services = ref<Service[]>([]);

const searchTerm = ref('');
const activeTab = ref<string>(ALL_TAB);

const { favouriteIds, isFavourite, toggle: toggleFavourite, reconcile } = useFavourites();

const categoryById = computed(
  () => new Map(categories.value.map((category) => [category.id, category])),
);

/** Stable accent index per category, derived from display order. */
const accentByCategoryId = computed(() => {
  const map = new Map<number, number>();
  categories.value.forEach((category, index) => map.set(category.id, index));
  return map;
});

const categoryLabel = (id: number) => categoryById.value.get(id)?.label ?? 'Uncategorised';
const accentIndex = (id: number) => accentByCategoryId.value.get(id) ?? 0;

const countsByCategory = computed(() => {
  const counts = new Map<number, number>();
  for (const service of services.value) {
    counts.set(service.categoryId, (counts.get(service.categoryId) ?? 0) + 1);
  }
  return counts;
});

const normalizedSearch = computed(() => searchTerm.value.trim().toLowerCase());
const isSearching = computed(() => normalizedSearch.value.length > 0);

/**
 * Search deliberately ignores the active tab and looks across every category,
 * matching name, description and category label. The active tab only filters
 * when the search box is empty.
 */
const visibleServices = computed(() => {
  const term = normalizedSearch.value;

  if (term) {
    return services.value.filter((service) => {
      const haystack = [
        service.name,
        service.description ?? '',
        categoryLabel(service.categoryId),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  if (activeTab.value === ALL_TAB) return services.value;

  const categoryId = Number(activeTab.value);
  return services.value.filter((service) => service.categoryId === categoryId);
});

const favouriteServices = computed(() => {
  const pinned = new Set(favouriteIds.value);
  return services.value.filter((service) => pinned.has(service.id));
});

const resultAnnouncement = computed(() => {
  if (loading.value) return '';
  const count = visibleServices.value.length;
  const noun = count === 1 ? 'service' : 'services';
  if (isSearching.value) {
    return count === 0
      ? `No services match "${searchTerm.value.trim()}".`
      : `${count} ${noun} match "${searchTerm.value.trim()}".`;
  }
  return `${count} ${noun} listed.`;
});

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    const payload = await api.getPortal();
    organization.value = payload.organization;
    lastUpdated.value = payload.lastUpdated;
    categories.value = payload.categories;
    services.value = payload.services;
    reconcile(payload.services.map((service) => service.id));
  } catch (error) {
    // Never leave a blank page: keep the chrome, explain what happened.
    loadError.value =
      error instanceof Error
        ? error.message
        : 'The service directory could not be loaded right now.';
    categories.value = [];
    services.value = [];
  } finally {
    loading.value = false;
  }
}

// A search that empties out should not strand the reader on a hidden tab.
watch(normalizedSearch, (term, previous) => {
  if (previous && !term) activeTab.value = ALL_TAB;
});

onMounted(load);
</script>

<template>
  <div class="portal">
    <a class="id-skip-link" href="#services">Skip to the service list</a>

    <header class="header">
      <div class="id-page header__inner">
        <div class="header__identity">
          <AppLogo :name="organization?.name ?? 'Information Desk'" />
          <div class="header__titles">
            <h1 class="header__org">{{ organization?.name ?? 'Information Desk' }}</h1>
            <p class="header__subtitle">Information Desk</p>
          </div>
        </div>

        <div class="header__actions">
          <span
            class="header__count"
            :aria-label="`${services.length} services available`"
          >
            <span aria-hidden="true">Services</span>
            <Badge :value="String(services.length)" severity="secondary" />
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="id-page main">
      <section class="search" aria-label="Search services">
        <IconField class="search__field">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchTerm"
            type="search"
            placeholder="Search by name, description or category"
            aria-label="Search services by name, description or category"
            fluid
          />
        </IconField>
        <p class="search__hint id-muted">
          Searching looks across every category, not just the tab you are on.
        </p>
      </section>

      <Message
        v-if="loadError"
        severity="warn"
        :closable="false"
        class="notice"
      >
        <div class="notice__body">
          <span>{{ loadError }}</span>
          <Button label="Try again" size="small" severity="secondary" outlined @click="load" />
        </div>
      </Message>

      <section
        v-if="!loading && !isSearching && favouriteServices.length > 0"
        class="favourites"
        aria-labelledby="favourites-heading"
      >
        <h2 id="favourites-heading" class="id-section-heading">Your favourites</h2>
        <div class="grid grid--favourites">
          <ServiceCard
            v-for="service in favouriteServices"
            :key="`fav-${service.id}`"
            :service="service"
            :category-label="categoryLabel(service.categoryId)"
            :accent-index="accentIndex(service.categoryId)"
            :is-favourite="true"
            show-category
            @toggle-favourite="toggleFavourite"
          />
        </div>
      </section>

      <Tabs v-if="!loading && categories.length > 0" v-model:value="activeTab" scrollable>
        <TabList>
          <Tab :value="ALL_TAB">
            All
            <Badge :value="String(services.length)" severity="secondary" class="tab__badge" />
          </Tab>
          <Tab v-for="category in categories" :key="category.id" :value="String(category.id)">
            {{ category.label }}
            <Badge
              :value="String(countsByCategory.get(category.id) ?? 0)"
              severity="secondary"
              class="tab__badge"
            />
          </Tab>
        </TabList>
      </Tabs>

      <p class="id-visually-hidden" aria-live="polite" role="status">{{ resultAnnouncement }}</p>

      <section id="services" class="results" aria-label="Services">
        <ServiceGridSkeleton v-if="loading" />

        <div v-else-if="visibleServices.length > 0" class="grid">
          <ServiceCard
            v-for="service in visibleServices"
            :key="service.id"
            :service="service"
            :category-label="categoryLabel(service.categoryId)"
            :accent-index="accentIndex(service.categoryId)"
            :is-favourite="isFavourite(service.id)"
            :show-category="isSearching || activeTab === ALL_TAB"
            @toggle-favourite="toggleFavourite"
          />
        </div>

        <div v-else class="empty">
          <i class="pi pi-inbox empty__icon" aria-hidden="true" />
          <p class="empty__title">
            <template v-if="isSearching">Nothing matches "{{ searchTerm.trim() }}"</template>
            <template v-else-if="loadError">The directory is unavailable</template>
            <template v-else>Nothing here yet</template>
          </p>
          <p class="empty__hint id-muted">
            <template v-if="isSearching">
              Try a shorter word, or clear the search to browse every category.
            </template>
            <template v-else-if="loadError">
              Please try again in a moment, or contact the service desk if it persists.
            </template>
            <template v-else>
              Once an administrator adds services they will appear here.
            </template>
          </p>
          <Button
            v-if="isSearching"
            label="Clear search"
            severity="secondary"
            outlined
            size="small"
            @click="searchTerm = ''"
          />
        </div>
      </section>
    </main>

    <PortalFooter :organization="organization" :last-updated="lastUpdated" />
  </div>
</template>

<style scoped>
.portal {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--id-panel-background) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--id-panel-border);
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--id-space-2);
  padding-block: var(--id-space-2);
}

.header__identity {
  display: flex;
  align-items: center;
  gap: var(--id-space-2);
  min-width: 0;
}

.header__titles {
  min-width: 0;
}

.header__org {
  font-size: 1.125rem;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header__subtitle {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.header__actions {
  display: flex;
  align-items: center;
  gap: var(--id-space-1);
}

.header__count {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--id-panel-border);
  border-radius: 999px;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.main {
  flex: 1;
  padding-block: var(--id-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--id-space-3);
}

.search__field {
  width: min(100%, 34rem);
}

.search__hint {
  margin: var(--id-space-1) 0 0;
  font-size: 0.8125rem;
}

.notice__body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--id-space-2);
}

.favourites {
  display: flex;
  flex-direction: column;
  gap: var(--id-space-1);
}

.grid {
  display: grid;
  gap: var(--id-space-2);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
}

.tab__badge {
  margin-left: 0.5rem;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--id-space-1);
  padding: var(--id-space-8) var(--id-space-2);
  text-align: center;
  background: var(--id-panel-background);
  border: 1px dashed var(--id-panel-border-strong);
  border-radius: var(--id-radius);
}

.empty__icon {
  font-size: 1.75rem;
  color: var(--p-text-muted-color);
  opacity: 0.7;
}

.empty__title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}

.empty__hint {
  margin: 0;
  max-width: 32rem;
  font-size: 0.875rem;
}

/* The tab strip scrolls sideways on narrow screens rather than wrapping. */
.portal :deep(.p-tablist-tab-list) {
  flex-wrap: nowrap;
}

.portal :deep(.p-tab) {
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .header__subtitle {
    display: none;
  }

  .header__count span[aria-hidden='true'] {
    display: none;
  }

  .main {
    padding-block: var(--id-space-3);
  }
}
</style>
