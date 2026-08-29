<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

withDefaults(defineProps<{ count?: number }>(), { count: 8 });
</script>

<template>
  <div class="grid" aria-hidden="true">
    <div v-for="index in count" :key="index" class="tile">
      <Skeleton shape="circle" size="2.5rem" />
      <div class="tile__lines">
        <Skeleton width="65%" height="1rem" />
        <Skeleton width="90%" height="0.75rem" />
        <Skeleton width="45%" height="0.75rem" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--id-space-2);
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.tile {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--id-space-2);
  padding: var(--id-space-2);
  background: var(--id-panel-background);
  border: 1px solid var(--id-panel-border);
  border-radius: var(--id-radius);
}

.tile__lines {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
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
}
</style>
