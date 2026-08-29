<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Organization name, used for the alt text and the text fallback. */
    name?: string;
    size?: 'sm' | 'md';
  }>(),
  { name: 'Information Desk', size: 'md' },
);

// Swap client/public/logo.png to rebrand. When the file is absent we fall back
// to clean initials rather than a broken-image icon.
const failed = ref(false);

const initials = () =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || 'ID';
</script>

<template>
  <span class="logo" :class="`logo--${size}`">
    <img
      v-if="!failed"
      class="logo__image"
      src="/logo.png"
      :alt="`${name} logo`"
      decoding="async"
      @error="failed = true"
    />
    <span v-else class="logo__fallback" aria-hidden="true">{{ initials() }}</span>
  </span>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  overflow: hidden;
  border-radius: var(--id-radius-sm);
}

.logo--md {
  width: 2.75rem;
  height: 2.75rem;
}

.logo--sm {
  width: 2.25rem;
  height: 2.25rem;
}

.logo__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}

.logo--sm .logo__fallback {
  font-size: 0.8rem;
}
</style>
