<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';

import IconPicker from '@/components/IconPicker.vue';
import type { AdminCategory, AdminService, ServiceInput } from '@/api/types';

const props = defineProps<{
  service: AdminService | null;
  categories: AdminCategory[];
  saving: boolean;
  /** Field-level messages returned by the API, keyed by field name. */
  fieldErrors: Record<string, string>;
  generalError: string | null;
}>();

const visible = defineModel<boolean>('visible', { required: true });

const emit = defineEmits<{ (event: 'save', input: ServiceInput): void }>();

const name = ref('');
const url = ref('');
const categoryId = ref<number | null>(null);
const description = ref('');
const icon = ref<string | null>(null);
const isActive = ref(true);
const localError = ref<string | null>(null);

const isEdit = computed(() => props.service !== null);
const title = computed(() => (isEdit.value ? 'Edit service' : 'Add service'));

function reset(): void {
  const service = props.service;
  name.value = service?.name ?? '';
  url.value = service?.url ?? '';
  categoryId.value = service?.categoryId ?? props.categories[0]?.id ?? null;
  description.value = service?.description ?? '';
  icon.value = service?.icon ?? null;
  isActive.value = service?.isActive ?? true;
  localError.value = null;
}

// Re-seed the form whenever the dialog opens or the target service changes.
watch(visible, (open) => {
  if (open) reset();
});
watch(() => props.service, reset);

function submit(): void {
  if (props.saving) return;

  if (!name.value.trim()) {
    localError.value = 'Give the service a name.';
    return;
  }
  if (!url.value.trim()) {
    localError.value = 'Enter the link staff should open.';
    return;
  }
  if (categoryId.value === null) {
    localError.value = 'Choose a category.';
    return;
  }

  localError.value = null;
  emit('save', {
    name: name.value.trim(),
    url: url.value.trim(),
    categoryId: categoryId.value,
    description: description.value.trim() || null,
    icon: icon.value,
    isActive: isActive.value,
  });
}

const errorFor = (field: string) => props.fieldErrors[field] ?? null;
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="title"
    modal
    :draggable="false"
    :style="{ width: 'min(34rem, 94vw)' }"
    :dismissable-mask="!saving"
    :closable="!saving"
  >
    <form class="form" novalidate @submit.prevent="submit">
      <Message
        v-if="localError || generalError"
        severity="error"
        :closable="false"
        role="alert"
        class="form__message"
      >
        {{ localError ?? generalError }}
      </Message>

      <div class="form__field">
        <label class="form__label" for="service-name">Name</label>
        <InputText
          id="service-name"
          v-model="name"
          :disabled="saving"
          :invalid="Boolean(errorFor('name'))"
          placeholder="Expense Claims"
          autocomplete="off"
          fluid
        />
        <small v-if="errorFor('name')" class="form__error">{{ errorFor('name') }}</small>
      </div>

      <div class="form__field">
        <label class="form__label" for="service-url">Link</label>
        <InputText
          id="service-url"
          v-model="url"
          :disabled="saving"
          :invalid="Boolean(errorFor('url'))"
          placeholder="https://expenses.example.org"
          inputmode="url"
          autocomplete="off"
          aria-describedby="service-url-hint"
          fluid
        />
        <small v-if="errorFor('url')" class="form__error">{{ errorFor('url') }}</small>
        <small v-else id="service-url-hint" class="form__hint id-muted">
          Must start with https:// (or http:// on an internal network).
        </small>
      </div>

      <div class="form__row">
        <div class="form__field">
          <label class="form__label" for="service-category">Category</label>
          <Select
            id="service-category"
            v-model="categoryId"
            :options="categories"
            option-label="label"
            option-value="id"
            :disabled="saving"
            :invalid="Boolean(errorFor('categoryId'))"
            placeholder="Choose a category"
            fluid
          />
          <small v-if="errorFor('categoryId')" class="form__error">
            {{ errorFor('categoryId') }}
          </small>
        </div>

        <div class="form__field">
          <label class="form__label" for="service-icon">Icon</label>
          <IconPicker v-model="icon" input-id="service-icon" :disabled="saving" />
        </div>
      </div>

      <div class="form__field">
        <label class="form__label" for="service-description">Description</label>
        <Textarea
          id="service-description"
          v-model="description"
          :disabled="saving"
          rows="2"
          auto-resize
          maxlength="280"
          placeholder="One line explaining what staff use it for."
          fluid
        />
        <small class="form__hint id-muted">{{ description.length }} / 280 characters</small>
      </div>

      <div class="form__toggle">
        <ToggleSwitch v-model="isActive" input-id="service-active" :disabled="saving" />
        <label for="service-active" class="form__toggle-label">
          <span class="form__label">Visible on the portal</span>
          <small class="id-muted">Turn this off to hide the service without deleting it.</small>
        </label>
      </div>
    </form>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        text
        :disabled="saving"
        @click="visible = false"
      />
      <Button
        :label="isEdit ? 'Save changes' : 'Add service'"
        :loading="saving"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--id-space-2);
}

.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--id-space-2);
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.form__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.form__hint,
.form__error {
  font-size: 0.75rem;
}

.form__error {
  color: var(--id-danger-text);
}

.form__message {
  margin: 0;
}

.form__toggle {
  display: flex;
  align-items: flex-start;
  gap: var(--id-space-2);
  padding-top: 0.25rem;
}

.form__toggle-label {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  cursor: pointer;
}

.form__toggle-label small {
  font-size: 0.75rem;
}

@media (max-width: 560px) {
  .form__row {
    grid-template-columns: 1fr;
  }
}
</style>
