import { syncLocaleCookie } from '@nexum-ag/start-intl'
import { createRouter } from '@tanstack/react-router'
import { routing } from './i18n'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({ routeTree })
  syncLocaleCookie(router, routing)

  return router
}
