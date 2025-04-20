// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue' // Example Home View
import WorldCountries from '../components/WorldCountries.vue' // Adjust path
import AfricanCountries from '../components/AfricanCountries.vue' // Adjust path
import UsStates from '../components/UsStates.vue' // Adjust path
import FrenchDepartments from '../components/FrenchDepartments.vue' // Adjust path

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView // Replace with your actual home component
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
    }
    // Add other routes as needed
  ]
})

export default router
