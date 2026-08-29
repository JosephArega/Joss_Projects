<script setup lang="ts">
import { computed } from 'vue';
import Select from 'primevue/select';

/**
 * A curated slice of PrimeIcons rather than the full set: a short, meaningful
 * list is far easier for a non-developer to choose from.
 */
const ICON_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'No icon (use initials)', value: null },
  { label: 'Building', value: 'pi pi-building' },
  { label: 'Server', value: 'pi pi-server' },
  { label: 'Database', value: 'pi pi-database' },
  { label: 'Home', value: 'pi pi-home' },
  { label: 'Folder', value: 'pi pi-folder-open' },
  { label: 'Document', value: 'pi pi-file' },
  { label: 'Book', value: 'pi pi-book' },
  { label: 'Calendar', value: 'pi pi-calendar' },
  { label: 'Clock', value: 'pi pi-clock' },
  { label: 'People', value: 'pi pi-users' },
  { label: 'Person', value: 'pi pi-user' },
  { label: 'Identity card', value: 'pi pi-id-card' },
  { label: 'Wallet', value: 'pi pi-wallet' },
  { label: 'Receipt', value: 'pi pi-receipt' },
  { label: 'Shopping cart', value: 'pi pi-shopping-cart' },
  { label: 'Credit card', value: 'pi pi-credit-card' },
  { label: 'Chart (bars)', value: 'pi pi-chart-bar' },
  { label: 'Chart (line)', value: 'pi pi-chart-line' },
  { label: 'Chart (pie)', value: 'pi pi-chart-pie' },
  { label: 'Ticket', value: 'pi pi-ticket' },
  { label: 'Wrench', value: 'pi pi-wrench' },
  { label: 'Cog', value: 'pi pi-cog' },
  { label: 'Key', value: 'pi pi-key' },
  { label: 'Shield', value: 'pi pi-shield' },
  { label: 'Lock', value: 'pi pi-lock' },
  { label: 'Envelope', value: 'pi pi-envelope' },
  { label: 'Phone', value: 'pi pi-phone' },
  { label: 'Comments', value: 'pi pi-comments' },
  { label: 'Bell', value: 'pi pi-bell' },
  { label: 'Globe', value: 'pi pi-globe' },
  { label: 'External link', value: 'pi pi-external-link' },
  { label: 'Map marker', value: 'pi pi-map-marker' },
  { label: 'Truck', value: 'pi pi-truck' },
  { label: 'Box', value: 'pi pi-box' },
  { label: 'Download', value: 'pi pi-download' },
  { label: 'Upload', value: 'pi pi-upload' },
  { label: 'Search', value: 'pi pi-search' },
  { label: 'Check square', value: 'pi pi-check-square' },
  { label: 'Heart', value: 'pi pi-heart' },
  { label: 'Star', value: 'pi pi-star' },
  { label: 'Bolt', value: 'pi pi-bolt' },
  { label: 'Desktop', value: 'pi pi-desktop' },
  { label: 'Mobile', value: 'pi pi-mobile' },
  { label: 'Sitemap', value: 'pi pi-sitemap' },
  { label: 'Briefcase', value: 'pi pi-briefcase' },
  { label: 'Graduation cap', value: 'pi pi-graduation-cap' },
];

const model = defineModel<string | null>({ default: null });

defineProps<{ inputId?: string; disabled?: boolean }>();

const options = computed(() => ICON_OPTIONS);
</script>

<template>
  <Select
    v-model="model"
    :input-id="inputId"
    :options="options"
    option-label="label"
    option-value="value"
    :disabled="disabled"
    placeholder="Choose an icon"
    filter
    filter-placeholder="Find an icon"
    :auto-filter-focus="true"
    fluid
  >
    <template #value="{ value }">
      <span class="picker__row">
        <i
          v-if="value"
          :class="value"
          class="picker__icon"
          aria-hidden="true"
        />
        <i v-else class="pi pi-stop picker__icon picker__icon--empty" aria-hidden="true" />
        <span>{{ options.find((option) => option.value === value)?.label ?? 'Choose an icon' }}</span>
      </span>
    </template>

    <template #option="{ option }">
      <span class="picker__row">
        <i
          v-if="option.value"
          :class="option.value"
          class="picker__icon"
          aria-hidden="true"
        />
        <i v-else class="pi pi-stop picker__icon picker__icon--empty" aria-hidden="true" />
        <span>{{ option.label }}</span>
      </span>
    </template>
  </Select>
</template>

<style scoped>
.picker__row {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
}

.picker__icon {
  width: 1rem;
  text-align: center;
  color: var(--id-accent-text);
}

.picker__icon--empty {
  color: var(--p-text-muted-color);
  opacity: 0.5;
}
</style>
