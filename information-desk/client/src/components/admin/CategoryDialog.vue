<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';

import IconPicker from '@/components/IconPicker.vue';
import type { AdminCategory, CategoryInput } from '@/api/types';

const props = defineProps<{
  category: AdminCategory | null;
  saving: boolean;
  generalError: string | null;
}>();

const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ (event: 'save', input: CategoryInput): void }>();

const label = ref('');
const icon = ref<string | null>(null);
const localError = ref<string | null>(null);

const isEdit = computed(() => props.category !== null);

function reset(): void {
  label.value = props.category?.label ?? '';
  icon.value = props.category?.icon ?? null;
  localError.value = null;
}

watch(visible, (open) => {
  if (open) reset();
});
watch(() => props.category, reset);

function submit(): void {
  if (props.saving) return;
  if (!label.value.trim()) {
    localError.value = 'Give the category a name.';
    return;
  }
  localError.value = null;
  emit('save', { label: label.value.trim(), icon: icon.value });
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="isEdit ? 'Rename category' : 'Add category'"
    modal
    :draggable="false"
    :style="{ width: 'min(28rem, 94vw)' }"
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
        <label class="form__label" for="category-label">Name</label>
        <InputText
          id="category-label"
          v-model="label"
          :disabled="saving"
          placeholder="Finance"
          autocomplete="off"
          fluid
        />
        <small v-if="!isEdit" class="form__hint id-muted">
          A URL key is generated from this name automatically.
        </small>
      </div>

      <div class="form__field">
        <label class="form__label" for="category-icon">Icon</label>
        <IconPicker v-model="icon" input-id="category-icon" :disabled="saving" />
      </div>
    </form>

    <template #footer>
      <Button label="Cancel" severity="secondary" text :disabled="saving" @click="visible = false" />
      <Button :label="isEdit ? 'Save changes' : 'Add category'" :loading="saving" @click="submit" />
    </template>
  </Dialog>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--id-space-2);
}

.form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.form__hint {
  font-size: 0.75rem;
}

.form__message {
  margin: 0;
}
</style>
