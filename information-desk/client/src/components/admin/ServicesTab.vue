<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

import ServiceDialog from './ServiceDialog.vue';
import { ApiError, api } from '@/api/client';
import { handleAuthError } from '@/router';
import type { AdminCategory, AdminService, ServiceInput } from '@/api/types';

const props = defineProps<{
  services: AdminService[];
  categories: AdminCategory[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (event: 'changed'): void;
  (event: 'update:services', services: AdminService[]): void;
}>();

const toast = useToast();
const confirm = useConfirm();

const search = ref('');
const categoryFilter = ref<number | null>(null);
const dialogVisible = ref(false);
const editing = ref<AdminService | null>(null);
const saving = ref(false);
const fieldErrors = ref<Record<string, string>>({});
const generalError = ref<string | null>(null);
const reordering = ref(false);

const categoryOptions = computed(() => [
  { id: null as number | null, label: 'All categories' },
  ...props.categories.map((category) => ({ id: category.id as number | null, label: category.label })),
]);

const filtersActive = computed(
  () => search.value.trim().length > 0 || categoryFilter.value !== null,
);

const filteredServices = computed(() => {
  const term = search.value.trim().toLowerCase();
  return props.services.filter((service) => {
    if (categoryFilter.value !== null && service.categoryId !== categoryFilter.value) return false;
    if (!term) return true;
    return [service.name, service.url, service.description ?? '', service.categoryLabel ?? '']
      .join(' ')
      .toLowerCase()
      .includes(term);
  });
});

/**
 * Drag-to-reorder writes an absolute order back to the server, so it is only
 * offered on the unfiltered list — reordering a filtered subset would silently
 * reposition the rows that are hidden.
 */
const canReorder = computed(() => !filtersActive.value && !props.loading);

function reportError(error: unknown, fallback: string): void {
  if (handleAuthError(error)) return;

  if (error instanceof ApiError) {
    fieldErrors.value = Object.fromEntries(
      error.fields.map((field) => [field.path, field.message]),
    );
    // One bad field reads far better spelled out than as "some fields need
    // attention"; several are left to the inline messages under each input.
    const detail = error.fields.length === 1 ? error.fields[0].message : error.message;
    generalError.value = detail;
    toast.add({ severity: 'error', summary: fallback, detail, life: 6000 });
    return;
  }

  generalError.value = fallback;
  toast.add({ severity: 'error', summary: fallback, life: 6000 });
}

function openCreate(): void {
  editing.value = null;
  fieldErrors.value = {};
  generalError.value = null;
  dialogVisible.value = true;
}

function openEdit(service: AdminService): void {
  editing.value = service;
  fieldErrors.value = {};
  generalError.value = null;
  dialogVisible.value = true;
}

async function save(input: ServiceInput): Promise<void> {
  saving.value = true;
  fieldErrors.value = {};
  generalError.value = null;
  try {
    if (editing.value) {
      await api.updateService(editing.value.id, input);
      toast.add({
        severity: 'success',
        summary: 'Service updated',
        detail: input.name,
        life: 3500,
      });
    } else {
      await api.createService(input);
      toast.add({ severity: 'success', summary: 'Service added', detail: input.name, life: 3500 });
    }
    dialogVisible.value = false;
    emit('changed');
  } catch (error) {
    reportError(error, editing.value ? 'Could not update the service' : 'Could not add the service');
  } finally {
    saving.value = false;
  }
}

function confirmDelete(service: AdminService): void {
  confirm.require({
    header: 'Remove from the portal?',
    message: `"${service.name}" will stop appearing on the portal. Its history is kept and you can switch it back on at any time.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Remove',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      try {
        await api.deleteService(service.id);
        toast.add({
          severity: 'success',
          summary: 'Removed from the portal',
          detail: service.name,
          life: 3500,
        });
        emit('changed');
      } catch (error) {
        reportError(error, 'Could not remove the service');
      }
    },
  });
}

async function toggleActive(service: AdminService): Promise<void> {
  try {
    await api.updateService(service.id, { isActive: !service.isActive });
    toast.add({
      severity: 'success',
      summary: service.isActive ? 'Hidden from the portal' : 'Visible on the portal',
      detail: service.name,
      life: 3000,
    });
    emit('changed');
  } catch (error) {
    reportError(error, 'Could not change visibility');
  }
}

async function onRowReorder(event: DataTableRowReorderEvent): Promise<void> {
  const reordered = event.value as AdminService[];
  // Optimistic: show the new order immediately, roll back if the write fails.
  const previous = props.services;
  emit('update:services', reordered);

  reordering.value = true;
  try {
    const { services } = await api.reorderServices(reordered.map((service) => service.id));
    emit('update:services', services);
    toast.add({ severity: 'success', summary: 'Order saved', life: 2500 });
  } catch (error) {
    emit('update:services', previous);
    reportError(error, 'Could not save the new order');
  } finally {
    reordering.value = false;
  }
}

function clearFilters(): void {
  search.value = '';
  categoryFilter.value = null;
}
</script>

<template>
  <section class="tab" aria-label="Services">
    <div class="toolbar">
      <IconField class="toolbar__search">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="search"
          type="search"
          placeholder="Search services"
          aria-label="Search services"
          fluid
        />
      </IconField>

      <Select
        v-model="categoryFilter"
        :options="categoryOptions"
        option-label="label"
        option-value="id"
        aria-label="Filter by category"
        placeholder="All categories"
        class="toolbar__filter"
      />

      <Button
        v-if="filtersActive"
        label="Clear"
        severity="secondary"
        text
        size="small"
        @click="clearFilters"
      />

      <span class="toolbar__spacer" />

      <Button label="Add service" icon="pi pi-plus" @click="openCreate" />
    </div>

    <Message v-if="filtersActive" severity="secondary" :closable="false" class="hint">
      Drag-to-reorder is available when no search or category filter is applied.
    </Message>

    <DataTable
      :value="filteredServices"
      data-key="id"
      :loading="loading || reordering"
      :row-hover="true"
      :reorderable-rows="canReorder"
      striped-rows
      size="small"
      scrollable
      :pt="{ table: { style: 'min-width: 46rem' } }"
      @row-reorder="onRowReorder"
    >
      <template #empty>
        <div class="empty">
          <p class="empty__title">
            {{ filtersActive ? 'No services match those filters.' : 'No services yet.' }}
          </p>
          <Button
            v-if="filtersActive"
            label="Clear filters"
            severity="secondary"
            outlined
            size="small"
            @click="clearFilters"
          />
          <Button v-else label="Add the first service" size="small" @click="openCreate" />
        </div>
      </template>

      <Column
        v-if="canReorder"
        row-reorder
        :style="{ width: '3rem' }"
        :reorderable-column="false"
        header=""
      />

      <Column field="name" header="Name" :style="{ minWidth: '14rem' }">
        <template #body="{ data }">
          <div class="cell-name">
            <i v-if="data.icon" :class="data.icon" class="cell-name__icon" aria-hidden="true" />
            <span v-else class="cell-name__icon cell-name__icon--empty" aria-hidden="true">
              {{ data.name.slice(0, 1).toUpperCase() }}
            </span>
            <div class="cell-name__text">
              <span class="cell-name__title">{{ data.name }}</span>
              <a
                class="cell-name__url"
                :href="data.url"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="`Open ${data.name} in a new tab`"
              >
                {{ data.url }}
              </a>
            </div>
          </div>
        </template>
      </Column>

      <Column field="categoryLabel" header="Category" :style="{ minWidth: '9rem' }" />

      <Column field="isActive" header="Status" :style="{ width: '8rem' }">
        <template #body="{ data }">
          <Tag
            :value="data.isActive ? 'Active' : 'Hidden'"
            :severity="data.isActive ? 'success' : 'secondary'"
          />
        </template>
      </Column>

      <Column header="Actions" :style="{ width: '10rem' }" :frozen="false">
        <template #body="{ data }">
          <div class="cell-actions">
            <Button
              :icon="data.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'"
              severity="secondary"
              text
              rounded
              size="small"
              :aria-label="data.isActive ? `Hide ${data.name}` : `Show ${data.name}`"
              v-tooltip.top="data.isActive ? 'Hide from the portal' : 'Show on the portal'"
              @click="toggleActive(data)"
            />
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              size="small"
              :aria-label="`Edit ${data.name}`"
              v-tooltip.top="'Edit'"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              :disabled="!data.isActive"
              :aria-label="`Remove ${data.name} from the portal`"
              v-tooltip.top="data.isActive ? 'Remove from the portal' : 'Already hidden'"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <ServiceDialog
      v-model:visible="dialogVisible"
      :service="editing"
      :categories="categories"
      :saving="saving"
      :field-errors="fieldErrors"
      :general-error="generalError"
      @save="save"
    />
  </section>
</template>

<style scoped>
.tab {
  display: flex;
  flex-direction: column;
  gap: var(--id-space-2);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--id-space-1);
}

.toolbar__search {
  flex: 1 1 16rem;
  max-width: 24rem;
}

.toolbar__filter {
  min-width: 12rem;
}

.toolbar__spacer {
  flex: 1 1 auto;
}

.hint {
  margin: 0;
}

.cell-name {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.cell-name__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex: none;
  border-radius: var(--id-radius-sm);
  background: var(--p-content-hover-background, var(--id-panel-border));
  color: var(--id-accent-text);
  font-size: 0.8125rem;
  font-weight: 700;
}

.cell-name__icon--empty {
  color: var(--p-text-muted-color);
}

.cell-name__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cell-name__title {
  font-weight: 600;
}

.cell-name__url {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 22rem;
}

.cell-name__url:hover {
  color: var(--id-accent-text);
  text-decoration: underline;
}

.cell-actions {
  display: flex;
  gap: 0.125rem;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--id-space-1);
  padding: var(--id-space-4) var(--id-space-2);
  text-align: center;
}

.empty__title {
  margin: 0;
  color: var(--p-text-muted-color);
}

@media (max-width: 680px) {
  .toolbar__search,
  .toolbar__filter {
    flex: 1 1 100%;
    max-width: none;
  }

  .toolbar__spacer {
    display: none;
  }
}
</style>
