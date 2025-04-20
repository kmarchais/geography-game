import { createRouter, createWebHistory } from 'vue-router';
import WorldCountries from '../views/WorldCountries.vue';
import UsStates from '../views/UsStates.vue';
import FrenchDepartments from '../views/FrenchDepartments.vue';
import AfricanCountries from '../views/AfricanCountries.vue';
import Home from '../views/Home.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/world',
    name: 'World Countries',
    component: WorldCountries,
  },
  {
    path: '/us-states',
    name: 'US States',
    component: UsStates,
  },
  {
    path: '/french-departments',
    name: 'French Departments',
    component: FrenchDepartments,
  },
  {
    path: '/african-countries',
    name: 'African Countries',
    component: AfricanCountries,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;