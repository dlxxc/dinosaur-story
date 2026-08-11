import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/story/:id',
    name: 'Story',
    component: () => import('../views/StoryView.vue')
  }
]

const router = createRouter({
  // Vite base：dev '/' / prod '/dinosaur-story/'，
  // Hash Router 的 base 需要与 vite 保持一致，否则 router.push 生成的 URL 不包含前缀
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

export default router
