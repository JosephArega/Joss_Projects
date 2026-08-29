import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { ApiError, hasSessionHint } from '@/api/client';
import { useAuth } from '@/composables/useAuth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'portal',
    component: () => import('@/views/PortalView.vue'),
    meta: { title: 'Information Desk' },
  },
  {
    path: '/admin/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Sign in' },
  },
  {
    path: '/admin/change-password',
    name: 'change-password',
    component: () => import('@/views/ChangePasswordView.vue'),
    meta: { requiresAuth: true, title: 'Change your password' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, title: 'Administration' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'portal' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

/**
 * Guard: every protected route asks the server who we are. A 401 clears local
 * state and bounces to the login screen; a forced password change is funnelled
 * to its own view before the dashboard becomes reachable.
 */
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;

  const auth = useAuth();

  let admin = auth.admin.value;
  if (!admin && !hasSessionHint()) {
    // No session cookies at all: no need to ask the server who we are.
    auth.clear();
    return { name: 'login', query: to.name === 'admin' ? undefined : { redirect: to.fullPath } };
  }

  if (!admin) {
    try {
      admin = await auth.refresh();
    } catch {
      // Network failure rather than a rejected session: send them to the
      // login screen, which surfaces the error properly.
      return { name: 'login', query: { redirect: to.fullPath } };
    }
  }

  if (!admin) {
    auth.clear();
    return { name: 'login', query: to.name === 'admin' ? undefined : { redirect: to.fullPath } };
  }

  if (admin.mustChangePassword && to.name !== 'change-password') {
    return { name: 'change-password' };
  }

  if (!admin.mustChangePassword && to.name === 'change-password') {
    return { name: 'admin' };
  }

  return true;
});

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Information Desk';
  document.title = to.name === 'portal' ? title : `${title} · Information Desk`;
});

/** Shared 401 handling for views: clear the session and go to login. */
export function handleAuthError(error: unknown): boolean {
  if (error instanceof ApiError && error.isUnauthorized) {
    useAuth().clear();
    void router.push({ name: 'login' });
    return true;
  }
  if (error instanceof ApiError && error.requiresPasswordChange) {
    void router.push({ name: 'change-password' });
    return true;
  }
  return false;
}
