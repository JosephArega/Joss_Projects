<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';

import AppLogo from '@/components/AppLogo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { ApiError } from '@/api/client';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const route = useRoute();
const auth = useAuth();

const username = ref('');
const password = ref('');
const submitting = ref(false);
const errorMessage = ref<string | null>(null);
const usernameField = ref<{ $el?: HTMLElement } | null>(null);

onMounted(() => {
  // Focus the first field so the form is usable straight from the keyboard.
  const input = usernameField.value?.$el as HTMLInputElement | undefined;
  input?.focus();
});

async function submit(): Promise<void> {
  if (submitting.value) return;
  errorMessage.value = null;

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Enter your username and password.';
    return;
  }

  submitting.value = true;
  try {
    const admin = await auth.login(username.value.trim(), password.value);
    password.value = '';

    if (admin.mustChangePassword) {
      await router.replace({ name: 'change-password' });
      return;
    }

    const redirect = route.query.redirect;
    await router.replace(typeof redirect === 'string' ? redirect : { name: 'admin' });
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : 'Could not sign in. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth__corner">
      <ThemeToggle />
    </div>

    <main class="auth__panel">
      <Card class="auth__card">
        <template #header>
          <div class="auth__brand">
            <AppLogo />
            <div>
              <h1 class="auth__title">Information Desk</h1>
              <p class="auth__subtitle">Administration sign-in</p>
            </div>
          </div>
        </template>

        <template #content>
          <form class="auth__form" novalidate @submit.prevent="submit">
            <Message
              v-if="errorMessage"
              severity="error"
              :closable="false"
              class="auth__error"
              role="alert"
            >
              {{ errorMessage }}
            </Message>

            <div class="auth__field">
              <label class="auth__label" for="username">Username</label>
              <InputText
                id="username"
                ref="usernameField"
                v-model="username"
                autocomplete="username"
                :disabled="submitting"
                :invalid="Boolean(errorMessage)"
                fluid
              />
            </div>

            <div class="auth__field">
              <label class="auth__label" for="password">Password</label>
              <Password
                id="password"
                v-model="password"
                :feedback="false"
                toggle-mask
                autocomplete="current-password"
                :disabled="submitting"
                :invalid="Boolean(errorMessage)"
                input-class="w-full"
                fluid
              />
            </div>

            <Button
              type="submit"
              label="Sign in"
              :loading="submitting"
              fluid
            />
          </form>
        </template>

        <template #footer>
          <RouterLink class="auth__back" to="/">
            <i class="pi pi-arrow-left" aria-hidden="true" /> Back to the portal
          </RouterLink>
        </template>
      </Card>
    </main>
  </div>
</template>

<style scoped>
.auth {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--id-space-3);
  background: var(--id-page-background);
}

.auth__corner {
  position: absolute;
  top: var(--id-space-2);
  right: var(--id-space-2);
}

.auth__panel {
  width: min(100%, 25rem);
}

.auth__card {
  border: 1px solid var(--id-panel-border);
  box-shadow: var(--id-shadow-lifted);
}

.auth__brand {
  display: flex;
  align-items: center;
  gap: var(--id-space-2);
  padding: var(--id-space-3) var(--id-space-3) 0;
}

.auth__title {
  font-size: 1.125rem;
  font-weight: 650;
}

.auth__subtitle {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--id-space-2);
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.auth__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.auth__error {
  margin: 0;
}

.auth__back {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  text-decoration: none;
}

.auth__back:hover {
  color: var(--p-text-color);
}
</style>
