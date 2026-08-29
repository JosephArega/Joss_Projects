<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { useTheme } from '@/composables/useTheme';

const { mode, toggle } = useTheme();

const label = computed(() =>
  mode.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
);
</script>

<template>
  <Button
    type="button"
    severity="secondary"
    text
    rounded
    :aria-label="label"
    v-tooltip.bottom="label"
    @click="toggle"
  >
    <i :class="mode === 'dark' ? 'pi pi-sun' : 'pi pi-moon'" aria-hidden="true" />
  </Button>
</template>
