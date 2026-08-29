<script setup lang="ts">
import { computed } from 'vue';
import type { Service } from '@/api/types';

const props = defineProps<{
  service: Service;
  categoryLabel: string;
  /** Index into the accent hue set, so a category keeps one colour. */
  accentIndex: number;
  isFavourite: boolean;
  /** Shown while searching, so a hit from another tab explains itself. */
  showCategory?: boolean;
}>();

const emit = defineEmits<{ (event: 'toggle-favourite', id: string): void }>();

/** Initials fallback when a service has no PrimeIcon assigned. */
const initials = computed(() =>
  props.service.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join(''),
);

/** "https://erp.example.org/x" -> "erp.example.org" */
const host = computed(() => {
  try {
    return new URL(props.service.url).hostname.replace(/^www\./, '');
  } catch {
    return props.service.url;
  }
});

const favouriteLabel = computed(() =>
  props.isFavourite
    ? `Remove ${props.service.name} from favourites`
    : `Add ${props.service.name} to favourites`,
);
</script>

<template>
  <div class="shell" :data-accent="accentIndex % 8">
    <!-- The anchor is the card: the entire tile is one link target. -->
    <a
      class="card"
      :href="service.url"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`${service.name} — opens ${host} in a new tab`"
    >
      <span class="card__icon" aria-hidden="true">
        <i v-if="service.icon" :class="service.icon" />
        <span v-else class="card__initials">{{ initials }}</span>
      </span>

      <span class="card__name">{{ service.name }}</span>

      <span v-if="service.description" class="card__description">{{ service.description }}</span>

      <span class="card__footer">
        <span v-if="showCategory" class="card__category">{{ categoryLabel }}</span>
        <span v-else class="card__host">{{ host }}</span>
        <span class="card__arrow" aria-hidden="true">
          <i class="pi pi-arrow-up-right" />
        </span>
      </span>
    </a>

    <button
      type="button"
      class="star"
      :class="{ 'star--on': isFavourite }"
      :aria-label="favouriteLabel"
      :aria-pressed="isFavourite"
      v-tooltip.top="isFavourite ? 'Remove from favourites' : 'Add to favourites'"
      @click="emit('toggle-favourite', service.id)"
    >
      <i :class="isFavourite ? 'pi pi-star-fill' : 'pi pi-star'" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.shell {
  position: relative;
  height: 100%;
}

.card {
  /* Icon and name share the first row; the description and footer then run
     the full width of the card, which keeps long text readable instead of
     squeezing it into a narrow middle column. */
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto 1fr;
  align-items: center;
  column-gap: var(--id-space-2);
  row-gap: 0.5rem;
  height: 100%;
  padding: var(--id-space-2);
  background: var(--id-panel-background);
  border: 1px solid var(--id-panel-border);
  border-radius: var(--id-radius);
  box-shadow: var(--id-shadow-resting);
  text-decoration: none;
  color: inherit;
  transition:
    transform var(--id-transition),
    box-shadow var(--id-transition),
    border-color var(--id-transition),
    background-color var(--id-transition);
}

.card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--id-accent) 45%, var(--id-panel-border));
  box-shadow: var(--id-shadow-lifted);
}

.card:focus-visible {
  outline: 2px solid var(--p-primary-color);
  outline-offset: 2px;
}

.card__icon {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  flex: none;
  border-radius: var(--id-radius-sm);
  background: var(--id-accent-surface);
  color: var(--id-accent);
  font-size: 1.05rem;
  transition: background-color var(--id-transition);
}

.card__initials {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.card__name {
  grid-column: 2;
  grid-row: 1;
  /* Clears the favourite button that floats over the card's top-right. */
  padding-right: 1.75rem;
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.3;
  color: var(--p-text-color);
  overflow-wrap: anywhere;
}

.card__description {
  grid-column: 1 / -1;
  grid-row: 2;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--p-text-muted-color);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__footer {
  grid-column: 1 / -1;
  grid-row: 3;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--id-space-1);
  min-width: 0;
}

.card__category {
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: var(--id-accent-surface);
  color: var(--id-accent);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__host {
  font-size: 0.75rem;
  /* No opacity here: dimming the muted token further drops this below the
     4.5:1 AA threshold for small text. */
  color: var(--p-text-muted-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  color: var(--p-text-muted-color);
  opacity: 0.65;
  transition:
    transform var(--id-transition),
    opacity var(--id-transition),
    color var(--id-transition);
}

.card:hover .card__arrow,
.card:focus-visible .card__arrow {
  transform: translate(2px, -2px);
  opacity: 1;
  color: var(--id-accent);
}

/* Sits above the card rather than inside it: a <button> may not be nested in
   an <a>, and both need to be reachable by keyboard in a sensible order. */
.star {
  position: absolute;
  top: calc(var(--id-space-1) * 0.75);
  right: calc(var(--id-space-1) * 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--p-text-muted-color);
  cursor: pointer;
  opacity: 0.55;
  transition:
    opacity var(--id-transition),
    color var(--id-transition),
    background-color var(--id-transition);
}

.star:hover,
.star:focus-visible {
  opacity: 1;
  background: var(--p-content-hover-background, var(--id-accent-surface));
}

.star--on {
  opacity: 1;
  color: var(--id-accent);
}

.shell:hover .star {
  opacity: 1;
}
</style>
