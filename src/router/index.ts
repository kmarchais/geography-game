import { createRouter, createWebHistory } from 'vue-router';
import MapView from '../components/MapView.vue';

const routes = [
  {
    path: '/',
    component: MapView,
  }
];

const router = createRouter({
  history: createWebHistory('/geography-game/'),
  routes,
});

export default router;
