import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import App from './App.vue';
import { router } from './router';

import 'primeicons/primeicons.css';
import './style.css';

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
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
