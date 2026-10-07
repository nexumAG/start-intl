import { createLocaleRewrite, syncLocaleCookie } from '@nexum-ag/start-intl'
import { createRouter } from '@tanstack/react-router'
import { routing } from './i18n'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    rewrite: createLocaleRewrite(routing),
  })
  syncLocaleCookie(router, routing)

  return router
}
