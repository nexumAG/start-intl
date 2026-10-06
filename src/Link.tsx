import {
  type ActiveOptions,
  defaultParseSearch,
  Link as RouterLink,
  useRouter,
} from '@tanstack/react-router'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { useLocale } from 'use-intl'
import {
  getLocalePrefix,
  isLocalisedPath,
  serializeLocaleCookie,
  stripLocalePrefix,
} from './request.js'
import type { Routing } from './routing.js'

const externalPrefixes = [
  'http://',
  'https://',
  '//',
  'www.',
  'mailto:',
  'tel:',
]

export type SearchParser = (searchStr: string) => Record<string, unknown>

export function isInternalHref(href: string | undefined): boolean {
  if (!href || href.startsWith('#')) {
    return false
  }

  return !externalPrefixes.some((prefix) => href.startsWith(prefix))
}

// CMS hrefs carry raw query strings; parsing them with the router's own parser
// is what makes `?page=2` stringify back to `?page=2` instead of `?page="2"`.
export function splitHref(
  href: string,
  parseSearch: SearchParser = defaultParseSearch
) {
  const [pathAndQuery, ...hashParts] = href.split('#')
  const [pathname, query = ''] = pathAndQuery.split('?')
  const hash = hashParts.join('#')
  const search = query === '' ? {} : parseSearch(`?${query}`)

  return {
    pathname,
    search: Object.keys(search).length > 0 ? search : undefined,
    hash: hash === '' ? undefined : hash,
  }
}

export type LinkProps<L extends string> = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  href: string
  locale?: L
  activeOptions?: ActiveOptions
}

// Internal hrefs target the `$locale` route tree; with 'as-needed' the router's
// `createLocaleRewrite` drops the default locale from the rendered URL.
export function createLink<L extends string>(routing: Routing<L>) {
  return function Link({
    href,
    locale,
    onClick,
    activeOptions = { exact: true },
    ...anchorProps
  }: LinkProps<L>) {
    const currentLocale = useLocale()
    // Missing in renders outside a RouterProvider, such as an off-screen SSR pass.
    const router = useRouter({ warn: false })
    const { pathname, search, hash } = splitHref(
      href,
      router?.options.parseSearch
    )

    if (!router || !isInternalHref(href) || !isLocalisedPath(pathname)) {
      return <a href={href} onClick={onClick} {...anchorProps} />
    }

    const targetLocale =
      locale ?? getLocalePrefix(pathname, routing) ?? currentLocale
    const path = stripLocalePrefix(pathname, routing)

    // A client-side switch never reaches the request middleware, so the link
    // remembers the choice itself, as next-intl's Link did.
    const handleClick =
      locale && locale !== currentLocale
        ? (event: MouseEvent<HTMLAnchorElement>) => {
            // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is async and not in every supported browser
            document.cookie = serializeLocaleCookie(locale, routing)
            onClick?.(event)
          }
        : onClick

    return (
      <RouterLink
        to={path === '/' ? `/${targetLocale}` : `/${targetLocale}${path}`}
        search={search}
        hash={hash}
        activeOptions={activeOptions}
        onClick={handleClick}
        {...anchorProps}
      />
    )
  }
}
