import {
  type ActiveOptions,
  defaultParseSearch,
  Link as RouterLink,
  useLocation,
  useRouter,
} from '@tanstack/react-router'
import type { AnchorHTMLAttributes } from 'react'
import { useLocale } from 'use-intl'
import {
  getLocalePrefix,
  isLocalisedPath,
  stripLocalePrefix,
} from './request.js'
import type { Routing } from './routing.js'

export type SearchParser = (searchStr: string) => Record<string, unknown>

// Like next-intl, only root-relative hrefs are localized; unlike it, `//host`
// is left alone because browsers resolve it to another origin.
export function isInternalHref(href: string | undefined): boolean {
  return !!href && href.startsWith('/') && !href.startsWith('//')
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

// Resolves like a browser would, so `foo` on `/de/jobs` is `/de/foo`; returns
// undefined when the href leaves the page's origin.
export function resolveHref(href: string, pageHref: string) {
  const page = new URL(pageHref, 'http://localhost')
  const url = new URL(href, page)

  return url.origin === page.origin
    ? `${url.pathname}${url.search}${url.hash}`
    : undefined
}

// Internal hrefs target the `$locale` route tree; with 'as-needed' the router's
// `createLocaleRewrite` drops the default locale from the rendered URL.
export function createLink<L extends string>(routing: Routing<L>) {
  function RoutedLink({
    href,
    locale,
    activeOptions = { exact: true },
    ...anchorProps
  }: LinkProps<L>) {
    const currentLocale = useLocale()
    const router = useRouter()
    const isRootRelative = href.startsWith('/')
    const pageHref = useLocation({
      select: (location) => (isRootRelative ? undefined : location.publicHref),
    })
    const internalHref =
      pageHref === undefined ? href : resolveHref(href, pageHref)

    if (internalHref === undefined || !isInternalHref(internalHref)) {
      return <a href={href} {...anchorProps} />
    }

    const { pathname, search, hash } = splitHref(
      internalHref,
      router.options.parseSearch
    )

    if (!isLocalisedPath(pathname)) {
      return <a href={href} {...anchorProps} />
    }

    const targetLocale =
      locale ?? getLocalePrefix(pathname, routing) ?? currentLocale
    const path = stripLocalePrefix(pathname, routing)

    return (
      <RouterLink
        to={path === '/' ? `/${targetLocale}` : `/${targetLocale}${path}`}
        search={search}
        hash={hash}
        activeOptions={activeOptions}
        {...anchorProps}
      />
    )
  }

  return function Link(props: LinkProps<L>) {
    // Missing in renders outside a RouterProvider, such as an off-screen SSR pass.
    const router = useRouter({ warn: false })

    if (!router) {
      const { locale, activeOptions, ...anchorProps } = props

      return <a {...anchorProps} />
    }

    return <RoutedLink {...props} />
  }
}
