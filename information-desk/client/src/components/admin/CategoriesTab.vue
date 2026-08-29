<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

import CategoryDialog from './CategoryDialog.vue';
import { ApiError, api } from '@/api/client';
import { handleAuthError } from '@/router';
import type { AdminCategory, CategoryInput } from '@/api/types';

const props = defineProps<{ categories: AdminCategory[]; loading: boolean }>();

const emit = defineEmits<{
  (event: 'changed'): void;
  (event: 'update:categories', categories: AdminCategory[]): void;
}>();

const toast = useToast();
const confirm = useConfirm();

const dialogVisible = ref(false);
const editing = ref<AdminCategory | null>(null);
const saving = ref(false);
const generalError = ref<string | null>(null);
const reordering = ref(false);

function reportError(error: unknown, fallback: string): void {
  if (handleAuthError(error)) return;
  const message = error instanceof ApiError ? error.message : fallback;
  generalError.value = message;
  toast.add({ severity: 'error', summary: fallback, detail: message, life: 7000 });
}

function openCreate(): void {
  editing.value = null;
  generalError.value = null;
  dialogVisible.value = true;
}

function openEdit(category: AdminCategory): void {
  editing.value = category;
  generalError.value = null;
  dialogVisible.value = true;
}

async function save(input: CategoryInput): Promise<void> {
  saving.value = true;
  generalError.value = null;
  try {
    if (editing.value) {
      await api.updateCategory(editing.value.id, input);
      toast.add({ severity: 'success', summary: 'Category updated', detail: input.label, life: 3500 });
    } else {
      await api.createCategory(input);
      toast.add({ severity: 'success', summary: 'Category added', detail: input.label, life: 3500 });
    }
    dialogVisible.value = false;
    emit('changed');
  } catch (error) {
    reportError(error, editing.value ? 'Could not update the category' : 'Could not add the category');
  } finally {
    saving.value = false;
  }
}

function confirmDelete(category: AdminCategory): void {
  // The server is the authority on the 409, but checking here lets us explain
  // the problem before the person commits to the action.
  if (category.serviceCount > 0) {
    confirm.require({
      header: 'Category is in use',
      message:
        `"${category.label}" still has ${category.serviceCount} service` +
        `${category.serviceCount === 1 ? '' : 's'} attached. Move them to another category first, ` +
        'then you can delete it.',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Got it',
      acceptProps: { severity: 'secondary' },
      rejectClass: 'p-hidden',
      rejectProps: { style: 'display:none' },
    });
    return;
  }

  confirm.require({
    header: 'Delete category?',
    message: `"${category.label}" will be removed. This cannot be undone.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      try {
        await api.deleteCategory(category.id);
        toast.add({ severity: 'success', summary: 'Category deleted', detail: category.label, life: 3500 });
        emit('changed');
      } catch (error) {
        reportError(error, 'Could not delete the category');
      }
    },
  });
}

async function onRowReorder(event: DataTableRowReorderEvent): Promise<void> {
  const reordered = event.value as AdminCategory[];
  const previous = props.categories;
  emit('update:categories', reordered);

  reordering.value = true;
  try {
    const { categories } = await api.reorderCategories(reordered.map((category) => category.id));
    emit('update:categories', categories);
    toast.add({ severity: 'success', summary: 'Order saved', life: 2500 });
  } catch (error) {
    emit('update:categories', previous);
    reportError(error, 'Could not save the new order');
  } finally {
    reordering.value = false;
  }
}
</script>

<template>
  <section class="tab" aria-label="Categories">
    <div class="toolbar">
      <p class="toolbar__hint id-muted">
        Drag a row to change the order the tabs appear in on the portal.
      </p>
      <Button label="Add category" icon="pi pi-plus" @click="openCreate" />
    </div>

    <DataTable
      :value="categories"
      data-key="id"
      :loading="loading || reordering"
      :row-hover="true"
      reorderable-rows
      striped-rows
      size="small"
      scrollable
      :pt="{ table: { style: 'min-width: 36rem' } }"
      @row-reorder="onRowReorder"
    >
      <template #empty>
        <div class="empty">
          <p class="empty__title">No categories yet.</p>
          <Button label="Add the first category" size="small" @click="openCreate" />
        </div>
      </template>

      <Column row-reorder :style="{ width: '3rem' }" header="" />

      <Column field="label" header="Name" :style="{ minWidth: '12rem' }">
        <template #body="{ data }">
          <div class="cell-name">
            <i v-if="data.icon" :class="data.icon" class="cell-name__icon" aria-hidden="true" />
            <div class="cell-name__text">
              <span class="cell-name__title">{{ data.label }}</span>
              <code class="cell-name__key">{{ data.key }}</code>
            </div>
          </div>
        </template>
      </Column>

      <Column header="Services" :style="{ width: '11rem' }">
        <template #body="{ data }">
          <Tag
            :value="`${data.activeServiceCount} active / ${data.serviceCount} total`"
            severity="secondary"
          />
        </template>
      </Column>

      <Column header="Actions" :style="{ width: '8rem' }">
        <template #body="{ data }">
          <div class="cell-actions">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              size="small"
              :aria-label="`Rename ${data.label}`"
              v-tooltip.top="'Rename'"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              :aria-label="`Delete ${data.label}`"
              v-tooltip.top="data.serviceCount > 0 ? 'Still in use' : 'Delete'"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <CategoryDialog
      v-model:visible="dialogVisible"
      :category="editing"
      :saving="saving"
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
  justify-content: space-between;
  gap: var(--id-space-1);
}

.toolbar__hint {
  margin: 0;
  font-size: 0.875rem;
}

.cell-name {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.cell-name__icon {
  color: var(--id-accent-text);
  width: 1rem;
  text-align: center;
}

.cell-name__text {
  display: flex;
  flex-direction: column;
}

.cell-name__title {
  font-weight: 600;
}

.cell-name__key {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
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
</style>
