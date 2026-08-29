import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import App from './App.vue';
import { router } from './router';

import 'primeicons/primeicons.css';
import './style.css';

/**
 * Aura's default brand colour is green (emerald). This organization's mark is
 * a deep blue, so the primary ramp is swapped for one built around that blue
 * — every button, link, active tab and focus ring follows from here. Status
 * colours (success/danger/warn) are untouched: those convey meaning
 * ("active", "delete") independent of brand colour.
 */
const InformationDeskPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
  },
});

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: InformationDeskPreset,
    options: {
      // Dark mode is driven by a class on <html>, toggled in useTheme(), so
      // the app controls it rather than the OS alone.
      darkModeSelector: '.app-dark',
      cssLayer: {
        name: 'primevue',
        order: 'base, primevue, app',
      },
    },
  },
  ripple: false,
});

app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);
app.use(router);

app.mount('#app');
