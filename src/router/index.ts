import { createRouter, createWebHistory } from 'vue-router'

// Atlas exposes one shared game screen on web and Android. Legacy mode source
// remains in the repository; old bookmarks return to the current challenge.
export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'globe', component: () => import('../views/GlobeGame.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
