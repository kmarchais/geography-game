import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WorldCountries from '../components/WorldCountries.vue'
import AfricanCountries from '../components/AfricanCountries.vue'
import UsStates from '../components/UsStates.vue'
import FrenchDepartments from '../components/FrenchDepartments.vue'
import SpanishCommunities from '../components/SpanishCommunities.vue'

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
    }
  ]
})

export default router
