import { createMiddleware } from '@tanstack/react-start'
import { getCookie, setResponseHeader } from '@tanstack/react-start/server'
import { resolveRequestRouting, serializeLocaleCookie } from './request.js'
import type { Routing } from './routing.js'

export type LocaleMiddlewareOptions<L extends string> = {
  localeOverride?: (url: URL) => L | undefined
  /** Sends the hreflang alternates as a `Link` header. */
  alternateLinks?: boolean
  /** Origin for the alternates; defaults to the request's. */
  siteUrl?: () => string
}

export function createLocaleMiddleware<L extends string>(
  routing: Routing<L>,
  {
    localeOverride,
    alternateLinks: sendAlternateLinks = false,
    siteUrl,
  }: LocaleMiddlewareOptions<L> = {}
) {
  return createMiddleware({ type: 'request' }).server(({ next, request }) => {
    const { redirect, cookie, alternateLinks } = resolveRequestRouting(
      {
        url: request.url,
        siteUrl: siteUrl?.(),
        cookieLocale: getCookie(routing.cookie.name),
        acceptLanguage: request.headers.get('accept-language') ?? undefined,
        secFetchDest: request.headers.get('sec-fetch-dest') ?? undefined,
        localeOverride: localeOverride?.(new URL(request.url)),
      },
      routing
    )
    const setCookie = cookie && serializeLocaleCookie(cookie, routing)

    if (redirect) {
      return new Response(null, {
        status: redirect.status,
        headers: {
          location: redirect.location,
          ...(setCookie && { 'set-cookie': setCookie }),
        },
      })
    }

    if (setCookie) {
      setResponseHeader('set-cookie', setCookie)
    }

    if (sendAlternateLinks && alternateLinks) {
      setResponseHeader('link', alternateLinks)
    }

    return next()
  })
}
