<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import Paginator, { type PageState } from 'primevue/paginator';
import Tag from 'primevue/tag';

import { ApiError, api } from '@/api/client';
import { handleAuthError } from '@/router';
import type { AuditEntry } from '@/api/types';

const entries = ref<AuditEntry[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(25);
const loading = ref(true);
const errorMessage = ref<string | null>(null);

const ACTION_SEVERITY: Record<AuditEntry['action'], string> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  login: 'secondary',
  password_change: 'warn',
};

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Removed',
  login: 'Signed in',
  password_change: 'Password changed',
};

const ENTITY_LABEL: Record<AuditEntry['entity'], string> = {
  service: 'Service',
  category: 'Category',
  admin: 'Administrator',
};

/** DataTable slot props arrive untyped, so the lookups are narrowed here. */
function actionLabel(action: AuditEntry['action']): string {
  return ACTION_LABEL[action] ?? action;
}

function actionSeverity(action: AuditEntry['action']): string {
  return ACTION_SEVERITY[action] ?? 'secondary';
}

function entityLabel(entity: AuditEntry['entity']): string {
  return ENTITY_LABEL[entity] ?? entity;
}

/** A short human summary of what the entry actually touched. */
function describe(entry: AuditEntry): string {
  const after = entry.after as Record<string, unknown> | null;
  const before = entry.before as Record<string, unknown> | null;

  if (after && Array.isArray(after.reordered)) {
    return `Reordered ${after.reordered.length} ${entry.entity === 'category' ? 'categories' : 'services'}`;
  }

  const name = (after?.name ?? after?.label ?? before?.name ?? before?.label ?? after?.username) as
    | string
    | undefined;

  if (name) return name;
  return entry.entityId ? `#${entry.entityId}` : '—';
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function load(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  try {
    const result = await api.listAudit(page.value, pageSize.value);
    entries.value = result.entries;
    total.value = result.total;
  } catch (error) {
    if (handleAuthError(error)) return;
    errorMessage.value =
      error instanceof ApiError ? error.message : 'Could not load the activity log.';
    entries.value = [];
  } finally {
    loading.value = false;
  }
}

function onPage(event: PageState): void {
  page.value = event.page + 1;
  pageSize.value = event.rows;
  void load();
}

onMounted(load);
</script>

<template>
  <section class="tab" aria-label="Activity">
    <p class="intro id-muted">
      Every change made through this dashboard is recorded here. The log is read-only.
    </p>

    <Message v-if="errorMessage" severity="warn" :closable="false" class="notice">
      {{ errorMessage }}
    </Message>

    <DataTable
      :value="entries"
      data-key="id"
      :loading="loading"
      striped-rows
      size="small"
      scrollable
      :pt="{ table: { style: 'min-width: 42rem' } }"
    >
      <template #empty>
        <p class="empty id-muted">Nothing has been recorded yet.</p>
      </template>

      <Column header="When" :style="{ width: '12rem' }">
        <template #body="{ data }">
          <time :datetime="data.createdAt">{{ formatTimestamp(data.createdAt) }}</time>
        </template>
      </Column>

      <Column header="Action" :style="{ width: '11rem' }">
        <template #body="{ data }">
          <Tag :value="actionLabel(data.action)" :severity="actionSeverity(data.action)" />
        </template>
      </Column>

      <Column header="Type" :style="{ width: '9rem' }">
        <template #body="{ data }">{{ entityLabel(data.entity) }}</template>
      </Column>

      <Column header="Item" :style="{ minWidth: '12rem' }">
        <template #body="{ data }">
          <span class="item">{{ describe(data) }}</span>
        </template>
      </Column>

      <Column header="By" :style="{ width: '9rem' }">
        <template #body="{ data }">
          <span :class="{ 'id-muted': !data.username }">{{ data.username ?? 'deleted account' }}</span>
        </template>
      </Column>
    </DataTable>

    <Paginator
      v-if="total > pageSize"
      :rows="pageSize"
      :total-records="total"
      :first="(page - 1) * pageSize"
      :rows-per-page-options="[25, 50, 100]"
      @page="onPage"
    />
  </section>
</template>

<style scoped>
.tab {
  display: flex;
  flex-direction: column;
  gap: var(--id-space-2);
}

.intro {
  margin: 0;
  font-size: 0.875rem;
}

.notice {
  margin: 0;
}

.item {
  overflow-wrap: anywhere;
}

.empty {
  margin: 0;
  padding: var(--id-space-4) var(--id-space-2);
  text-align: center;
}
</style>
