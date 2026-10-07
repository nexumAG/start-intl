import { createLocaleMiddleware } from '@nexum-ag/start-intl/middleware'
import { createStart } from '@tanstack/react-start'
import { routing } from './i18n'

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createLocaleMiddleware(routing, { alternateLinks: true }),
  ],
}))
