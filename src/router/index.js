import { createRouter, createWebHistory } from 'vue-router'
import { useStore } from '../store'

// Import views
import HomeView from '../views/HomeView.vue'

// 定义需要登录才能访问的路由
const authRequiredRoutes = ['scoring']

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/scoring/:teamId',
    name: 'scoring',
    component: () => import('../views/ScoringView.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/results',
    name: 'results',
    component: () => import('../views/ResultsView.vue')
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: {
      requiresAdmin: true
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  const store = useStore()
  
  // 检查是否需要管理员权限
  if (to.matched.some(record => record.meta.requiresAdmin)) {
    // 检查是否是管理员
    if (!store.isAdmin) {
      // 如果没有登录，重定向到登录页面
      next({
        path: '/',
        query: { redirect: to.fullPath }
      })
    } else {
      next()
    }
  }
  // 检查是否需要专家权限
  else if (to.matched.some(record => record.meta.requiresAuth)) {
    // 检查是否登录
    if (!store.isLoggedIn) {
      // 如果没有登录，重定向到登录页面
      next({
        path: '/',
        query: { redirect: to.fullPath }
      })
    } else {
      next()
    }
  } else {
    // 不需要权限，直接进入
    next()
  }
})

export default router 