<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';
import Password from 'primevue/password';
import { useToast } from 'primevue/usetoast';

import AppLogo from '@/components/AppLogo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { ApiError, api } from '@/api/client';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const toast = useToast();
const auth = useAuth();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const submitting = ref(false);
const errorMessage = ref<string | null>(null);

const forced = computed(() => auth.mustChangePassword.value);

const POLICY = 'At least 12 characters, including a letter and a number.';

function localValidationError(): string | null {
  if (!currentPassword.value) return 'Enter your current password.';
  if (newPassword.value.length < 12) return POLICY;
  if (!/[A-Za-z]/.test(newPassword.value) || !/\d/.test(newPassword.value)) return POLICY;
  if (newPassword.value === currentPassword.value) {
    return 'The new password must be different from your current one.';
  }
  if (newPassword.value !== confirmPassword.value) return 'The two new passwords do not match.';
  return null;
}

async function submit(): Promise<void> {
  if (submitting.value) return;

  const localError = localValidationError();
  if (localError) {
    errorMessage.value = localError;
    return;
  }

  errorMessage.value = null;
  submitting.value = true;
  try {
    const { admin } = await api.changePassword(currentPassword.value, newPassword.value);
    auth.setAdmin(admin);
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    toast.add({
      severity: 'success',
      summary: 'Password changed',
      detail: 'Your new password is now active.',
      life: 4000,
    });
    await router.replace({ name: 'admin' });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      auth.clear();
      await router.replace({ name: 'login' });
      return;
    }
    errorMessage.value =
      error instanceof ApiError ? error.message : 'Could not change your password. Try again.';
  } finally {
    submitting.value = false;
  }
}

async function signOut(): Promise<void> {
  await auth.logout().catch(() => undefined);
  await router.replace({ name: 'login' });
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
              <h1 class="auth__title">Choose a new password</h1>
              <p class="auth__subtitle">
                {{
                  forced
                    ? 'Your account still uses its initial password.'
                    : 'Update the password for your account.'
                }}
              </p>
            </div>
          </div>
        </template>

        <template #content>
          <Message
            v-if="forced"
            severity="info"
            :closable="false"
            class="auth__error"
            :pt="{ root: { role: 'status' } }"
          >
            The dashboard unlocks once you have replaced the initial password.
          </Message>

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
              <label class="auth__label" for="current">Current password</label>
              <Password
                id="current"
                v-model="currentPassword"
                :feedback="false"
                toggle-mask
                autocomplete="current-password"
                :disabled="submitting"
                fluid
              />
            </div>

            <div class="auth__field">
              <label class="auth__label" for="next">New password</label>
              <Password
                id="next"
                v-model="newPassword"
                toggle-mask
                autocomplete="new-password"
                :disabled="submitting"
                aria-describedby="policy"
                fluid
              />
              <p id="policy" class="auth__hint id-muted">{{ POLICY }}</p>
            </div>

            <div class="auth__field">
              <label class="auth__label" for="confirm">Confirm new password</label>
              <Password
                id="confirm"
                v-model="confirmPassword"
                :feedback="false"
                toggle-mask
                autocomplete="new-password"
                :disabled="submitting"
                fluid
              />
            </div>

            <Button type="submit" label="Change password" :loading="submitting" fluid />
          </form>
        </template>

        <template #footer>
          <Button
            label="Sign out"
            severity="secondary"
            text
            size="small"
            :disabled="submitting"
            @click="signOut"
          />
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
  width: min(100%, 27rem);
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
  font-size: 1.0625rem;
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

.auth__hint {
  margin: 0;
  font-size: 0.75rem;
}

.auth__error {
  margin: 0 0 var(--id-space-2);
}
</style>
