import { describe, expect, it } from 'vitest'
import {
  createLocaleRewrite,
  getAcceptLanguageLocale,
  getLocalisedPath,
  isLocalisedPath,
  type RoutingRequest,
  resolveRequestRouting,
  serializeLocaleCookie,
} from './request.js'
import { defineRouting, type Routing } from './routing.js'

const SITE = 'https://example.com'

const AS_NEEDED = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'as-needed',
})

const ALWAYS = defineRouting({ ...AS_NEEDED, localePrefix: 'always' })

function routeWith(routing: Routing) {
  return (path: string, options: Partial<RoutingRequest> = {}) =>
    resolveRequestRouting({ url: `${SITE}${path}`, ...options }, routing)
}

describe('defineRouting', () => {
  it('defaults to next-intl’s session cookie', () => {
    expect(AS_NEEDED.cookie).toEqual({ name: 'NEXT_LOCALE' })
  })
})

describe('serializeLocaleCookie', () => {
  it('writes a session cookie by default', () => {
    expect(serializeLocaleCookie('en', AS_NEEDED)).toBe(
      'NEXT_LOCALE=en; Path=/; SameSite=lax'
    )
  })

  it('applies the configured name and lifetime', () => {
    const routing = defineRouting({
      ...AS_NEEDED,
      cookie: { name: 'LOCALE', maxAge: 31536000 },
    })

    expect(serializeLocaleCookie('en', routing)).toBe(
      'LOCALE=en; Path=/; Max-Age=31536000; SameSite=lax'
    )
  })
})

describe('isLocalisedPath', () => {
  it.each([
    '/',
    '/jobs',
    '/en/about',
    '/wp-admin.php',
    '/version-2.0',
    '/job-search/auditor-12345',
  ])('localises %s', (path) => {
    expect(isLocalisedPath(path)).toBe(true)
  })

  it.each([
    '/api/de/search',
    '/_serverFn/abc',
    '/_build/main.js',
    '/assets/index-abc.css',
    '/assets/logo.svg',
    '/@vite/client',
    '/node_modules/.vite/deps/react.js',
    '/favicon.ico',
    '/sitemap.xml',
    '/robots.txt',
    '/sw.js',
    '/manifest.json',
    '/images/green-bg.webp',
  ])('leaves %s alone', (path) => {
    expect(isLocalisedPath(path)).toBe(false)
  })
})

describe('getAcceptLanguageLocale', () => {
  it.each([
    [undefined, 'de'],
    ['', 'de'],
    ['en-US,en;q=0.9', 'en'],
    ['EN-us', 'en'],
    ['en-GB,en;q=0.9,de;q=0.5', 'en'],
    ['fr-FR,fr;q=0.9,en;q=0.8,de;q=0.7', 'en'],
    ['de;q=0.5,en;q=0.9', 'en'],
    ['en;q=0', 'de'],
    ['en ;q=0.9,de;q=0.1', 'en'],
    ['fr', 'de'],
    ['*', 'de'],
  ])('maps %j to %s', (header, expected) => {
    expect(getAcceptLanguageLocale(header, AS_NEEDED)).toBe(expected)
  })
})

describe('getLocalisedPath', () => {
  it('leaves the default locale unprefixed only as needed', () => {
    expect(getLocalisedPath('/jobs', 'de', AS_NEEDED)).toBe('/jobs')
    expect(getLocalisedPath('/', 'de', AS_NEEDED)).toBe('/')
    expect(getLocalisedPath('/jobs', 'de', ALWAYS)).toBe('/de/jobs')
    expect(getLocalisedPath('/', 'de', ALWAYS)).toBe('/de')
    expect(getLocalisedPath('/', 'en', AS_NEEDED)).toBe('/en')
  })
})

describe.each([
  ['as-needed', AS_NEEDED],
  ['always', ALWAYS],
])('resolveRequestRouting, prefix %s', (_, routing) => {
  const route = routeWith(routing)

  it('ignores API requests, even with a trailing slash', () => {
    expect(route('/api/de/search/', { acceptLanguage: 'en' })).toEqual({})
  })

  it('redirects a trailing slash permanently, keeping the query', () => {
    expect(route('/en/jobs/?page=2').redirect).toEqual({
      location: '/en/jobs?page=2',
      status: 308,
    })
  })

  it.each(['/de//evil.com', '//evil.com/', '/de//evil.com/', '//evil.com/x'])(
    'never redirects %s to another host',
    (path) => {
      expect(route(path).redirect?.location ?? '/').toMatch(/^\/(?!\/)/)
    }
  )

  it('redirects an unprefixed path to the detected locale', () => {
    expect(route('/jobs', { acceptLanguage: 'en' }).redirect).toEqual({
      location: '/en/jobs',
      status: 307,
    })
    expect(route('/', { cookieLocale: 'en' }).redirect?.location).toBe('/en')
  })

  it('prefers the cookie over Accept-Language', () => {
    expect(
      route('/jobs', { cookieLocale: 'en', acceptLanguage: 'de' }).redirect
        ?.location
    ).toBe('/en/jobs')
  })

  it('ignores a cookie that names no enabled locale', () => {
    expect(
      route('/jobs', { cookieLocale: 'fr', acceptLanguage: 'en' }).redirect
        ?.location
    ).toBe('/en/jobs')
  })

  it('serves an explicit non-default prefix and remembers the choice', () => {
    const result = route('/en/about', { acceptLanguage: 'de' })

    expect(result.redirect).toBeUndefined()
    expect(result.cookie).toBe('en')
  })

  it('skips the cookie when it already matches or the browser asks for it', () => {
    expect(route('/en/about', { cookieLocale: 'en' }).cookie).toBeUndefined()
    expect(route('/en/about', { acceptLanguage: 'en' }).cookie).toBeUndefined()
  })

  it('only updates the cookie on document requests', () => {
    expect(
      route('/en/about', { cookieLocale: 'de', secFetchDest: 'empty' }).cookie
    ).toBeUndefined()
    expect(
      route('/en/about', { cookieLocale: 'de', secFetchDest: 'document' })
        .cookie
    ).toBe('en')
  })

  it('follows a locale override over the cookie, never writing it', () => {
    expect(
      route('/home', { localeOverride: 'en', cookieLocale: 'de' }).redirect
        ?.location
    ).toBe('/en/home')

    const english = route('/en/home', {
      localeOverride: 'en',
      acceptLanguage: 'de',
    })

    expect(english.redirect).toBeUndefined()
    expect(english.cookie).toBeUndefined()
  })

  it('keeps the URL prefix over a locale override', () => {
    const result = route('/en/careers', {
      localeOverride: 'de',
      cookieLocale: 'de',
    })

    expect(result.redirect).toBeUndefined()
    expect(result.cookie).toBeUndefined()
  })

  it('ignores an override that names no enabled locale', () => {
    expect(
      route('/home', { localeOverride: 'fr', cookieLocale: 'en' }).redirect
        ?.location
    ).toBe('/en/home')
  })

  it('advertises the alternates of the page in a Link header', () => {
    expect(
      route('/en/about?x=1', { siteUrl: 'https://karriere.example' })
        .alternateLinks
    ).toBe(
      [
        `<https://karriere.example${getLocalisedPath('/about', 'de', routing)}?x=1>; rel="alternate"; hreflang="de"`,
        '<https://karriere.example/en/about?x=1>; rel="alternate"; hreflang="en"',
        '<https://karriere.example/about?x=1>; rel="alternate"; hreflang="x-default"',
      ].join(', ')
    )
  })
})

describe('resolveRequestRouting, prefix as-needed', () => {
  const route = routeWith(AS_NEEDED)

  it('redirects the default locale prefix to the unprefixed path', () => {
    expect(route('/de/jobs?query=a')).toEqual({
      redirect: { location: '/jobs?query=a', status: 307 },
      cookie: undefined,
    })
    expect(route('/de').redirect?.location).toBe('/')
  })

  it('sets the cookie when switching to the default locale', () => {
    expect(route('/de/jobs', { cookieLocale: 'en' }).cookie).toBe('de')
  })

  it('serves the default locale unprefixed', () => {
    const result = route('/about')

    expect(result.redirect).toBeUndefined()
    expect(result.cookie).toBeUndefined()
  })

  it('serves the default locale override despite an English browser or cookie', () => {
    const result = route('/', {
      localeOverride: 'de',
      acceptLanguage: 'en-US,en;q=0.9',
      cookieLocale: 'en',
    })

    expect(result.redirect).toBeUndefined()
    expect(result.cookie).toBeUndefined()
  })

  it('moves a /de request to the unprefixed URL, where the override applies', () => {
    expect(route('/de/home', { localeOverride: 'en' }).redirect?.location).toBe(
      '/home'
    )
  })
})

describe('resolveRequestRouting, prefix always', () => {
  const route = routeWith(ALWAYS)

  it('redirects an unprefixed path to the default locale when nothing else matches', () => {
    expect(route('/jobs?query=a')).toEqual({
      redirect: { location: '/de/jobs?query=a', status: 307 },
      cookie: undefined,
    })
    expect(route('/').redirect?.location).toBe('/de')
  })

  it('serves the default locale prefix', () => {
    const result = route('/de/jobs', { acceptLanguage: 'de' })

    expect(result.redirect).toBeUndefined()
    expect(result.cookie).toBeUndefined()
  })

  it('sets the cookie when switching to the default locale', () => {
    expect(route('/de/jobs', { cookieLocale: 'en' }).cookie).toBe('de')
  })

  it('moves an unprefixed request to the override’s prefix', () => {
    expect(
      route('/home', { localeOverride: 'de', cookieLocale: 'en' }).redirect
        ?.location
    ).toBe('/de/home')
  })
})

describe('createLocaleRewrite', () => {
  const rewrite = (routing: Routing, direction: 'input' | 'output') => {
    const rewriter = createLocaleRewrite(routing)[direction]

    return (path: string) =>
      rewriter({ url: new URL(`${SITE}${path}`) })?.pathname
  }

  it('maps unprefixed URLs onto the default locale route with as-needed', () => {
    const input = rewrite(AS_NEEDED, 'input')

    expect(input('/')).toBe('/de')
    expect(input('/jobs')).toBe('/de/jobs')
    expect(input('/en/jobs')).toBeUndefined()
    expect(input('/api/search')).toBeUndefined()
    expect(input('/sitemap.xml')).toBeUndefined()
  })

  it('drops the default locale from URLs with as-needed', () => {
    const output = rewrite(AS_NEEDED, 'output')

    expect(output('/de')).toBe('/')
    expect(output('/de/jobs')).toBe('/jobs')
    expect(output('/en/jobs')).toBeUndefined()
  })

  it('leaves every URL alone with always', () => {
    expect(rewrite(ALWAYS, 'input')('/jobs')).toBeUndefined()
    expect(rewrite(ALWAYS, 'output')('/de/jobs')).toBeUndefined()
  })
})
