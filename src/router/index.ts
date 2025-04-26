import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WorldCountries from '../components/WorldCountries.vue'
import AfricanCountries from '../components/WorldCountries/AfricanCountries.vue'
import UsStates from '../components/AdministrativeDivisions/UsStates.vue'
import FrenchDepartments from '../components/FrenchDepartments.vue'
import SpanishCommunities from '../components/SpanishCommunities.vue'
import FlagGame from '@/components/FlagGame.vue'
import WorldCapitals from '../views/WorldCapitals.vue'
import EuropeMapGame from '../components/WorldCountries/EuropeMapGame.vue'
import AsiaMapGame from '../components/WorldCountries/AsiaMapGame.vue'
import NorthAmericaMapGame from '../components/WorldCountries/NorthAmericaMapGame.vue'
import SouthAmericaMapGame from '../components/WorldCountries/SouthAmericaMapGame.vue'
import OceaniaMapGame from '../components/WorldCountries/OceaniaMapGame.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/world-countries',
      name: 'world-countries',
      component: WorldCountries
    },
    {
      path: '/african-countries',
      name: 'african-countries',
      component: AfricanCountries
    },
    {
      path: '/european-countries',
      name: 'european-countries',
      component: EuropeMapGame
    },
    {
      path: '/asian-countries',
      name: 'asian-countries',
      component: AsiaMapGame
    },
    {
      path: '/north-american-countries',
      name: 'north-american-countries',
      component: NorthAmericaMapGame
    },
    {
      path: '/south-american-countries',
      name: 'south-american-countries',
      component: SouthAmericaMapGame
    },
    {
      path: '/oceanian-countries',
      name: 'oceanian-countries',
      component: OceaniaMapGame
    },
    {
      path: '/us-states',
      name: 'us-states',
      component: UsStates
    },
    {
      path: '/french-departments',
      name: 'french-departments',
      component: FrenchDepartments
    },
    {
      path: '/spanish-communities',
      name: 'spanish-communities',
      component: SpanishCommunities
    },
    {
      path: '/flag-game',
      name: 'flag-game',
      component: FlagGame
    },
    {
      path: '/world-capitals',
      name: 'world-capitals',
      component: WorldCapitals,
      meta: {
        title: 'World Capitals Game'
      }
    }
  ]
})

export default router
