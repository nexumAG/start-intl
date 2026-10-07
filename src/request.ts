import type { AnyRouter } from '@tanstack/react-router'
import type { Routing } from './routing.js'

const NON_PAGE_PREFIXES = [
  '/api/',
  '/_serverFn/',
  '/_build/',
  '/assets/',
  '/@',
  '/node_modules/',
]

// Static file types only, so a URL like /wp-admin.php still gets the localised
// 404 page.
const FILE_EXTENSION =
  /\.(?:ico|png|jpe?g|gif|svg|webp|avif|txt|xml|json|webmanifest|m?js|css|map|woff2?|pdf)$/

export type RequestRouting = {
  redirect?: { location: string; status: 307 | 308 }
  cookie?: string
  alternateLinks?: string
}

// Locale prefixes, detection and the locale cookie only apply to pages; API,
// server function and asset requests must reach their handler untouched.
export function isLocalisedPath(pathname: string): boolean {
  return (
    !NON_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !FILE_EXTENSION.test(pathname)
  )
}

export function getLocalePrefix<L extends string>(
  pathname: string,
  routing: Routing<L>
): L | undefined {
  const [, first] = pathname.split('/')

  return routing.locales.find((locale) => locale === first)
}

export function stripLocalePrefix(pathname: string, routing: Routing): string {
  const prefix = getLocalePrefix(pathname, routing)

  return prefix ? pathname.slice(prefix.length + 1) || '/' : pathname
}

export function getLocalisedPath(
  path: string,
  locale: string,
  routing: Routing
): string {
  if (
    routing.localePrefix === 'as-needed' &&
    locale === routing.defaultLocale
  ) {
    return path
  }

  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

export function serializeLocaleCookie(locale: string, routing: Routing) {
  const { name, maxAge } = routing.cookie
  const lifetime = maxAge === undefined ? '' : `; Max-Age=${maxAge}`

  return `${name}=${locale}; Path=/${lifetime}; SameSite=lax`
}

// A client-side navigation never reaches the request middleware, so the
// router remembers a locale switch itself, as next-intl's navigation APIs do.
export function syncLocaleCookie(router: AnyRouter, routing: Routing) {
  if (typeof document === 'undefined') {
    return () => {}
  }

  return router.subscribe('onResolved', ({ fromLocation, toLocation }) => {
    const locale = getLocalePrefix(toLocation.pathname, routing)

    if (
      fromLocation &&
      locale &&
      locale !== getLocalePrefix(fromLocation.pathname, routing)
    ) {
      // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is async and not in every supported browser
      document.cookie = serializeLocaleCookie(locale, routing)
    }
  })
}

export function getAcceptLanguageLocale<L extends string>(
  acceptLanguage: string | undefined,
  routing: Routing<L>
): L {
  const preferred = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';')
      const quality = params.find((param) => param.trim().startsWith('q='))

      return {
        tag: tag.trim(),
        quality: quality ? Number(quality.trim().slice(2)) : 1,
      }
    })
    .filter(({ tag, quality }) => tag && quality > 0)
    .sort((a, b) => b.quality - a.quality)

  for (const { tag } of preferred) {
    const match = routing.locales.find(
      (locale) => tag === locale || tag.split('-')[0] === locale
    )

    if (match) {
      return match
    }
  }

  return routing.defaultLocale
}

// next-intl's rules: only page navigations update the cookie, and a visitor
// without one only gets it once they pick a locale their browser did not ask for.
function getCookieUpdate({
  locale,
  cookieLocale,
  acceptLanguage,
  secFetchDest,
  routing,
}: {
  locale: string
  cookieLocale?: string
  acceptLanguage?: string
  secFetchDest?: string
  routing: Routing
}): string | undefined {
  if (secFetchDest && secFetchDest !== 'document') {
    return undefined
  }

  const reference =
    cookieLocale ?? getAcceptLanguageLocale(acceptLanguage, routing)

  return reference === locale ? undefined : locale
}

// x-default is the unprefixed URL, which detects the locale with 'always' and
// is the default locale's page with 'as-needed'.
function getAlternateLinks(
  siteUrl: string,
  path: string,
  search: string,
  routing: Routing
) {
  const link = (href: string, hreflang: string) =>
    `<${siteUrl}${href}${search}>; rel="alternate"; hreflang="${hreflang}"`

  return [
    ...routing.locales.map((locale) =>
      link(getLocalisedPath(path, locale, routing), locale)
    ),
    link(path, 'x-default'),
  ].join(', ')
}

// A leading `//` would make the Location header protocol-relative, pointing
// the browser at another host.
function sameOriginLocation(path: string, search: string) {
  return `${path.replace(/^\/+/, '/')}${search}`
}

export type RoutingRequest = {
  url: string
  siteUrl?: string
  cookieLocale?: string
  acceptLanguage?: string
  secFetchDest?: string
  /**
   * Wins over the cookie and Accept-Language, never over a URL prefix, and is
   * never written to the cookie (e.g. the Storyblok Visual Editor's language).
   */
  localeOverride?: string
}

export function resolveRequestRouting(
  {
    url,
    siteUrl,
    cookieLocale,
    acceptLanguage,
    secFetchDest,
    localeOverride,
  }: RoutingRequest,
  routing: Routing
): RequestRouting {
  const { origin, pathname, search } = new URL(url)

  if (!isLocalisedPath(pathname)) {
    return {}
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    const trimmed = pathname.replace(/\/+$/, '') || '/'

    return {
      redirect: { location: sameOriginLocation(trimmed, search), status: 308 },
    }
  }

  const prefix = getLocalePrefix(pathname, routing)
  const path = stripLocalePrefix(pathname, routing)
  const override = routing.locales.find((l) => l === localeOverride)
  const locale =
    prefix ??
    override ??
    routing.locales.find((candidate) => candidate === cookieLocale) ??
    getAcceptLanguageLocale(acceptLanguage, routing)

  const cookie = override
    ? undefined
    : getCookieUpdate({
        locale,
        cookieLocale,
        acceptLanguage,
        secFetchDest,
        routing,
      })

  const localisedPath = getLocalisedPath(path, locale, routing)

  if (localisedPath !== pathname) {
    return {
      redirect: {
        location: sameOriginLocation(localisedPath, search),
        status: 307,
      },
      cookie,
    }
  }

  return {
    cookie,
    alternateLinks: getAlternateLinks(siteUrl ?? origin, path, search, routing),
  }
}

// With 'as-needed' the route tree keeps a `$locale` segment for every locale
// while the browser URL drops the default one. Pass as the router's `rewrite`.
export function createLocaleRewrite(routing: Routing) {
  const asNeeded = routing.localePrefix === 'as-needed'

  return {
    input: ({ url }: { url: URL }) => {
      if (
        !asNeeded ||
        !isLocalisedPath(url.pathname) ||
        getLocalePrefix(url.pathname, routing)
      ) {
        return undefined
      }

      url.pathname = `/${routing.defaultLocale}${url.pathname === '/' ? '' : url.pathname}`

      return url
    },
    output: ({ url }: { url: URL }) => {
      if (
        !asNeeded ||
        getLocalePrefix(url.pathname, routing) !== routing.defaultLocale
      ) {
        return undefined
      }

      url.pathname = stripLocalePrefix(url.pathname, routing)

      return url
    },
  }
}
