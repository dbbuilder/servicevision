// Vue Router Configuration
// Defines application routes

import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: {
        title: 'ServiceVision - Business & Technology Consulting'
      }
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutPage.vue'),
      meta: {
        title: 'About ServiceVision'
      }
    },
    {
      path: '/services',
      name: 'services',
      component: () => import('@/views/ServicesPage.vue'),
      meta: {
        title: 'Our Services - ServiceVision'
      }
    },
    {
      path: '/contact',
      name: 'contact',      component: () => import('@/views/ContactPage.vue'),
      meta: {
        title: 'Contact Us - ServiceVision'
      }
    },
    // Catch all 404
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundPage.vue'),
      meta: {
        title: '404 - Page Not Found'
      }
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Update page title on route change
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'ServiceVision'
  next()
})

export default router