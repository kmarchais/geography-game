import { createRouter, createWebHistory, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WorldCountries from '../components/WorldCountries/WorldCountries.vue'
import AfricanCountries from '../components/WorldCountries/AfricanCountries.vue'
import UsStates from '../components/AdministrativeDivisions/UsStates.vue'
import CanadianProvinces from '../components/AdministrativeDivisions/CanadianProvinces.vue'
import FrenchDepartments from '../components/AdministrativeDivisions/FrenchDepartments.vue'
import SpanishCommunities from '../components/AdministrativeDivisions/SpanishCommunities.vue'
import FlagGame from '@/components/FlagGame.vue'
import WorldCapitals from '../views/WorldCapitals.vue'
import EuropeMapGame from '../components/WorldCountries/EuropeMapGame.vue'
import AsiaMapGame from '../components/WorldCountries/AsiaMapGame.vue'
import NorthAmericaMapGame from '../components/WorldCountries/NorthAmericaMapGame.vue'
import SouthAmericaMapGame from '../components/WorldCountries/SouthAmericaMapGame.vue'
import OceaniaMapGame from '../components/WorldCountries/OceaniaMapGame.vue'
import BrazilianStates from '../components/AdministrativeDivisions/BrazilianStates.vue'
import AustralianStates from '../components/AdministrativeDivisions/AustralianStates.vue'
import GermanStates from '../components/AdministrativeDivisions/GermanStates.vue'
import ItalianRegions from '../components/AdministrativeDivisions/ItalianRegions.vue'
import UkCounties from '../components/AdministrativeDivisions/UkCounties.vue'
import RussianOblasts from '../components/AdministrativeDivisions/RussianOblasts.vue'
import UkrainianOblasts from '../components/AdministrativeDivisions/UkrainianOblasts.vue'
import ChineseProvinces from '../components/AdministrativeDivisions/ChineseProvinces.vue'
import BelgianProvinces from '../components/AdministrativeDivisions/BelgianProvinces.vue'
import DutchProvinces from '../components/AdministrativeDivisions/DutchProvinces.vue'
import DashboardView from '../views/DashboardView.vue'
import ParisArrondissements from '../components/CityDistricts/ParisArrondissements.vue'
import ParisQuartiers from '../components/CityDistricts/ParisQuartiers.vue'
import ParisDistricts from '../components/CityDistricts/ParisDistricts.vue'
import LondonBoroughs from '../components/CityDistricts/LondonBoroughs.vue'
import BarcelonaDistricts from '../components/CityDistricts/BarcelonaDistricts.vue'
import BarcelonaBarrios from '../components/CityDistricts/BarcelonaBarrios.vue'
import BordeauxQuartiers from '../components/CityDistricts/BordeauxQuartiers.vue'

import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView},
    { path: '/world-countries', name: 'world-countries', component: WorldCountries },
    { path: '/african-countries', name: 'african-countries', component: AfricanCountries },
    { path: '/european-countries', name: 'european-countries', component: EuropeMapGame },
    { path: '/asian-countries', name: 'asian-countries', component: AsiaMapGame },
    { path: '/north-american-countries', name: 'north-american-countries', component: NorthAmericaMapGame },
    { path: '/south-american-countries', name: 'south-american-countries', component: SouthAmericaMapGame },
    { path: '/oceanian-countries', name: 'oceanian-countries', component: OceaniaMapGame },
    { path: '/us-states', name: 'us-states', component: UsStates },
    { path: '/russian-oblasts', name: 'russian-oblasts', component: RussianOblasts },
    { path: '/ukrainian-oblasts', name: 'ukrainian-oblasts', component: UkrainianOblasts },
    { path: '/chinese-provinces', name: 'chinese-provinces', component: ChineseProvinces },
    { path: '/uk-counties', name: 'uk-counties', component: UkCounties },
    { path: '/canadian-provinces', name: 'canadian-provinces', component: CanadianProvinces },
    { path: '/australian-states', name: 'australian-states', component: AustralianStates },
    { path: '/brazilian-states', name: 'brazilian-states', component: BrazilianStates },
    { path: '/french-departments', name: 'french-departments', component: FrenchDepartments },
    { path: '/belgian-provinces', name: 'belgian-provinces', component: BelgianProvinces },
    { path: '/dutch-provinces', name: 'dutch-provinces', component: DutchProvinces },
    { path: '/spanish-communities', name: 'spanish-communities', component: SpanishCommunities },
    { path: '/german-states', name: 'german-states', component: GermanStates },
    { path: '/italian-regions', name: 'italian-regions', component: ItalianRegions },
    { path: '/flag-game', name: 'flag-game', component: FlagGame },
    { path: '/world-capitals', name: 'world-capitals', component: WorldCapitals, meta: { title: 'World Capitals Game' } },
    { path: '/paris-arrondissements', name: 'paris-arrondissements', component: ParisArrondissements },
    { path: '/paris-quartiers', name: 'paris-quartiers', component: ParisQuartiers },
    { path: '/paris-districts', name: 'paris-districts', component: ParisDistricts },
    { path: '/london-boroughs', name: 'london-boroughs', component: LondonBoroughs },
    { path: '/barcelona-districts', name: 'barcelona-districts', component: BarcelonaDistricts },
    { path: '/barcelona-barrios', name: 'barcelona-barrios', component: BarcelonaBarrios },
    { path: '/bordeaux-quartiers', name: 'bordeaux-quartiers', component: BordeauxQuartiers },
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
