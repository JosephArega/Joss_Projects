<script setup lang="ts">
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useTheme } from '@/composables/useTheme';

// Applies the stored (or OS) theme before the first paint of the routed view.
useTheme();
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>

  <Toast position="bottom-right" />
  <ConfirmDialog />
</template>
