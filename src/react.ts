import { notFound } from '@tanstack/react-router'
import type { Routing } from './routing.js'

export {
  createLink,
  isInternalHref,
  type LinkProps,
  splitHref,
} from './Link.js'

export function parseLocale<L extends string>(
  locale: string,
  routing: Routing<L>
): L {
  const match = routing.locales.find((candidate) => candidate === locale)

  if (!match) {
    throw notFound()
  }

  return match
}
