import { createRouter, createWebHistory } from 'vue-router';
import FrenchDepartments from '../components/FrenchDepartments.vue';
import MapView from '../components/MapView.vue';
import UsStates from '../components/UsStates.vue';

const routes = [
  {
    path: '/',
    component: MapView,
  },
  {
    path: '/us-states',
    component: UsStates,
  },
  {
    path: '/french-departments',
    component: FrenchDepartments,
  },
];

const router = createRouter({
  history: createWebHistory('/geography-game/'),
  routes,
});

export default router;
