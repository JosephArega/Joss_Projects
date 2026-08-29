<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import { useToast } from 'primevue/usetoast';

import ActivityTab from '@/components/admin/ActivityTab.vue';
import AppLogo from '@/components/AppLogo.vue';
import CategoriesTab from '@/components/admin/CategoriesTab.vue';
import ServicesTab from '@/components/admin/ServicesTab.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { ApiError, api } from '@/api/client';
import { handleAuthError } from '@/router';
import type { AdminCategory, AdminService } from '@/api/types';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const toast = useToast();
const auth = useAuth();

const services = ref<AdminService[]>([]);
const categories = ref<AdminCategory[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const activeTab = ref('services');

const activeCount = computed(() => services.value.filter((service) => service.isActive).length);

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    const [serviceResult, categoryResult] = await Promise.all([
      api.listServices(),
      api.listCategories(),
    ]);
    services.value = serviceResult.services;
    categories.value = categoryResult.categories;
  } catch (error) {
    if (handleAuthError(error)) return;
    loadError.value =
      error instanceof ApiError ? error.message : 'Could not load the dashboard data.';
  } finally {
    loading.value = false;
  }
}

async function signOut(): Promise<void> {
  try {
    await auth.logout();
    toast.add({ severity: 'success', summary: 'Signed out', life: 2500 });
  } finally {
    await router.replace({ name: 'login' });
  }
}

onMounted(load);
</script>

<template>
  <div class="admin">
    <header class="header">
      <div class="id-page header__inner">
        <div class="header__identity">
          <AppLogo size="sm" />
          <div class="header__titles">
            <h1 class="header__title">Information Desk</h1>
            <p class="header__subtitle">
              Administration ·
              <span class="id-muted">{{ activeCount }} of {{ services.length }} visible</span>
            </p>
          </div>
        </div>

        <div class="header__actions">
          <Button
            label="View portal"
            icon="pi pi-external-link"
            severity="secondary"
            text
            size="small"
            class="header__portal"
            aria-label="View the public portal"
            @click="router.push({ name: 'portal' })"
          />
          <ThemeToggle />
          <Button
            :label="auth.admin.value?.username ?? 'Sign out'"
            icon="pi pi-sign-out"
            severity="secondary"
            outlined
            size="small"
            aria-label="Sign out"
            @click="signOut"
          />
        </div>
      </div>
    </header>

    <main class="id-page main">
      <Message v-if="loadError" severity="warn" :closable="false" class="notice">
        <div class="notice__body">
          <span>{{ loadError }}</span>
          <Button label="Try again" size="small" severity="secondary" outlined @click="load" />
        </div>
      </Message>

      <Tabs v-model:value="activeTab" scrollable>
        <TabList>
          <Tab value="services">Services</Tab>
          <Tab value="categories">Categories</Tab>
          <Tab value="activity">Activity</Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="services">
            <ServicesTab
              :services="services"
              :categories="categories"
              :loading="loading"
              @changed="load"
              @update:services="services = $event"
            />
          </TabPanel>

          <TabPanel value="categories">
            <CategoriesTab
              :categories="categories"
              :loading="loading"
              @changed="load"
              @update:categories="categories = $event"
            />
          </TabPanel>

          <TabPanel value="activity">
            <ActivityTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </main>
  </div>
</template>

<style scoped>
.admin {
  min-height: 100vh;
  background: var(--id-page-background);
}

.header {
  background: var(--id-panel-background);
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

.header__title {
  font-size: 1rem;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header__subtitle {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.header__titles {
  /* Lets the title ellipsis rather than pushing into the action buttons. */
  min-width: 0;
}

.header__actions {
  display: flex;
  align-items: center;
  flex: none;
  gap: var(--id-space-1);
}

.main {
  padding-block: var(--id-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--id-space-2);
}

.notice {
  margin: 0;
}

.notice__body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--id-space-2);
}

.admin :deep(.p-tabpanels) {
  background: transparent;
  padding: var(--id-space-3) 0 0;
}

.admin :deep(.p-tablist-tab-list) {
  flex-wrap: nowrap;
  background: transparent;
}

@media (max-width: 680px) {
  .header__subtitle {
    display: none;
  }

  /* Icon-only, so the header stays on one line on a phone. */
  .admin :deep(.header__portal .p-button-label) {
    display: none;
  }

  .header__actions :deep(.p-button-label) {
    max-width: 6rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
