import { defineRouting } from '@nexum-ag/start-intl'
import { createLink } from '@nexum-ag/start-intl/react'

export const routing = defineRouting({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  cookie: { maxAge: 60 * 60 * 24 * 365 },
})

export type Locale = (typeof routing.locales)[number]

export const Link = createLink(routing)

export const messages = {
  en: {
    Nav: { home: 'Home', about: 'About', switch: 'Deutsch' },
    Home: {
      title: 'Locale routing for TanStack Start',
      description:
        'Every page lives under one $locale route. Links keep the active language, and the switch in the header swaps it on the current page.',
      cta: 'See another page',
      docs: 'Read the docs',
    },
    About: {
      title: 'About us',
      description:
        'Same path in every language. Switch the language and watch the URL below.',
      back: 'Back home',
    },
    Details: { url: 'URL', locale: 'Locale' },
  },
  de: {
    Nav: { home: 'Start', about: 'Über uns', switch: 'English' },
    Home: {
      title: 'Sprachrouting für TanStack Start',
      description:
        'Jede Seite liegt unter einer $locale-Route. Links behalten die aktive Sprache, und der Schalter im Header wechselt sie auf der aktuellen Seite.',
      cta: 'Andere Seite ansehen',
      docs: 'Zur Doku',
    },
    About: {
      title: 'Über uns',
      description:
        'Gleicher Pfad in jeder Sprache. Wechsle die Sprache und achte auf die URL unten.',
      back: 'Zur Startseite',
    },
    Details: { url: 'URL', locale: 'Sprache' },
  },
} satisfies Record<Locale, unknown>
