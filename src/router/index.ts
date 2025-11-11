import { createRouter, createWebHistory, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import FrenchDepartments from '../components/AdministrativeDivisions/FrenchDepartments.vue'
import FlagGame from '@/components/FlagGame.vue'
import WorldCapitals from '../views/WorldCapitals.vue'
import DashboardView from '../views/DashboardView.vue'
import GameView from '../views/GameView.vue'
import StatsView from '../views/StatsView.vue'
import DailyChallengeView from '../views/DailyChallengeView.vue'

import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView},

    // Daily Challenge
    { path: '/daily-challenge', name: 'daily-challenge', component: DailyChallengeView },

    // Dynamic game route (new system)
    { path: '/game/:gameId', name: 'game', component: GameView },

    // Redirects from legacy routes to new dynamic routes
    // Countries
    { path: '/world-countries', redirect: '/game/world-countries' },
    { path: '/european-countries', redirect: '/game/europe-countries' },
    { path: '/african-countries', redirect: '/game/africa-countries' },
    { path: '/asian-countries', redirect: '/game/asia-countries' },
    { path: '/north-american-countries', redirect: '/game/north-america-countries' },
    { path: '/south-american-countries', redirect: '/game/south-america-countries' },
    { path: '/oceanian-countries', redirect: '/game/oceania-countries' },

    // Divisions
    { path: '/us-states', redirect: '/game/us-states' },
    { path: '/canadian-provinces', redirect: '/game/canadian-provinces' },
    { path: '/spanish-communities', redirect: '/game/spanish-communities' },
    { path: '/german-states', redirect: '/game/german-states' },
    { path: '/italian-regions', redirect: '/game/italian-regions' },
    { path: '/brazilian-states', redirect: '/game/brazilian-states' },
    { path: '/australian-states', redirect: '/game/australian-states' },
    { path: '/chinese-provinces', redirect: '/game/chinese-provinces' },
    { path: '/belgian-provinces', redirect: '/game/belgian-provinces' },
    { path: '/dutch-provinces', redirect: '/game/dutch-provinces' },
    { path: '/uk-counties', redirect: '/game/uk-counties' },
    { path: '/russian-oblasts', redirect: '/game/russian-oblasts' },
    { path: '/ukrainian-oblasts', redirect: '/game/ukrainian-oblasts' },

    // Cities
    { path: '/paris-arrondissements', redirect: '/game/paris-arrondissements' },
    { path: '/london-boroughs', redirect: '/game/london-boroughs' },
    { path: '/paris-quartiers', redirect: '/game/paris-quartiers' },
    { path: '/paris-districts', redirect: '/game/paris-districts' },
    { path: '/barcelona-districts', redirect: '/game/barcelona-districts' },
    { path: '/barcelona-barrios', redirect: '/game/barcelona-barrios' },
    { path: '/bordeaux-quartiers', redirect: '/game/bordeaux-quartiers' },

    // Stats view
    { path: '/stats', name: 'stats', component: StatsView },

    // Legacy routes (keep temporarily until all games migrated)
    // French Departments has custom UI/markers - migrate separately
    { path: '/french-departments', name: 'french-departments', component: FrenchDepartments },
    { path: '/flag-game', name: 'flag-game', component: FlagGame },
    { path: '/world-capitals', name: 'world-capitals', component: WorldCapitals, meta: { title: 'World Capitals Game' } },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true, requiresAdmin: true } }
  ]
})

router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const { isLoggedIn, userProfile } = useAuth();

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);

  if (requiresAdmin) {
    const isAdmin = isLoggedIn.value && !!userProfile.value?.is_admin;

    if (isAdmin) {
      next();
    } else {
      console.warn(`Unauthorized attempt to access admin route: ${to.path}. Redirecting home.`);
      next({ name: 'home' });
    }
  } else if (requiresAuth) {
    if (isLoggedIn.value) {
      next();
    } else {
      console.warn(`Unauthenticated attempt to access route: ${to.path}. Redirecting home.`);
      next({ name: 'home' });
    }
  } else {
    next();
  }
});


export default router
