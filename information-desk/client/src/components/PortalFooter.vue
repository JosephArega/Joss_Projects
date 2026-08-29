<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { Organization } from '@/api/types';

const props = defineProps<{
  organization: Organization | null;
  lastUpdated: string | null;
}>();

const lastUpdatedLabel = computed(() => {
  if (!props.lastUpdated) return null;
  const parsed = new Date(props.lastUpdated);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});
</script>

<template>
  <footer class="footer">
    <div class="id-page footer__inner">
      <div class="footer__contact">
        <span>
          Need something that is not listed? Contact the service desk at
          <a v-if="organization?.supportEmail" :href="`mailto:${organization.supportEmail}`">
            {{ organization.supportEmail }}
          </a>
          <template v-if="organization?.supportPhone">
            or on {{ organization.supportPhone }}</template
          >.
        </span>
        <span v-if="lastUpdatedLabel" class="id-muted footer__updated">
          Last updated {{ lastUpdatedLabel }}
        </span>
      </div>

      <RouterLink class="footer__admin" to="/admin">Admin</RouterLink>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: var(--id-space-8);
  border-top: 1px solid var(--id-panel-border);
  background: var(--id-panel-background);
}

.footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--id-space-2);
  padding-block: var(--id-space-3);
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.footer__contact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 46rem;
}

.footer__updated {
  font-size: 0.8125rem;
}

/* Deliberately quiet: staff should not mistake this for something they need. */
.footer__admin {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  text-decoration: none;
  padding: 0.25rem 0.5rem;
  border-radius: var(--id-radius-sm);
  transition: color var(--id-transition), background-color var(--id-transition);
}

.footer__admin:hover {
  color: var(--p-text-color);
  background: var(--p-content-hover-background, var(--id-panel-border));
}
</style>
