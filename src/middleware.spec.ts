import { getCookie, setResponseHeader } from '@tanstack/react-start/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createLocaleMiddleware,
  type LocaleMiddlewareOptions,
} from './middleware.js'
import { defineRouting } from './routing.js'

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: vi.fn(),
  setResponseHeader: vi.fn(),
}))

const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'always',
  cookie: { maxAge: 60 },
})

const passedOn = { response: new Response('page') }

function handle(
  path: string,
  {
    cookie,
    headers,
    ...options
  }: LocaleMiddlewareOptions<'de' | 'en'> & {
    cookie?: string
    headers?: Record<string, string>
  } = {}
) {
  vi.mocked(getCookie).mockReturnValue(cookie)
  const server = createLocaleMiddleware(routing, options).options.server
  const next = vi.fn(() => passedOn)

  // The middleware only reads `request` and calls `next`.
  const result = server?.({
    request: new Request(`https://example.com${path}`, { headers }),
    next,
  } as never)

  return { result: result as unknown as Response | typeof passedOn, next }
}

const setHeaders = () =>
  Object.fromEntries(vi.mocked(setResponseHeader).mock.calls)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createLocaleMiddleware', () => {
  it('redirects an unprefixed page to the cookie locale', () => {
    const { result, next } = handle('/jobs', {
      cookie: 'de',
      headers: { 'accept-language': 'en' },
    })

    expect(next).not.toHaveBeenCalled()
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(307)
    expect((result as Response).headers.get('location')).toBe('/de/jobs')
    expect((result as Response).headers.get('set-cookie')).toBeNull()
  })

  it('attaches the cookie to a redirect that changes the locale', () => {
    const { result } = handle('/jobs', {
      cookie: 'fr',
      headers: { 'accept-language': 'en' },
    })

    expect((result as Response).headers.get('location')).toBe('/en/jobs')
    expect((result as Response).headers.get('set-cookie')).toBe(
      'NEXT_LOCALE=en; Path=/; Max-Age=60; SameSite=lax'
    )
  })

  it('sets the cookie on a page the browser did not ask for', () => {
    const { result } = handle('/de', { headers: { 'accept-language': 'en' } })

    expect(result).toBe(passedOn)
    expect(setHeaders()).toEqual({
      'set-cookie': 'NEXT_LOCALE=de; Path=/; Max-Age=60; SameSite=lax',
    })
  })

  it('reads the configured cookie and passes pages on', () => {
    const { result, next } = handle('/en/jobs', { cookie: 'en' })

    expect(getCookie).toHaveBeenCalledWith('NEXT_LOCALE')
    expect(next).toHaveBeenCalledOnce()
    expect(result).toBe(passedOn)
    expect(setResponseHeader).not.toHaveBeenCalled()
  })

  it('applies the locale override', () => {
    const { result } = handle('/?_storyblok=1', {
      cookie: 'de',
      localeOverride: (url) =>
        url.searchParams.has('_storyblok') ? 'en' : undefined,
    })

    expect((result as Response).headers.get('location')).toBe(
      '/en?_storyblok=1'
    )
  })

  it('sends the alternates only when enabled', () => {
    handle('/en/jobs', { cookie: 'en' })
    expect(setHeaders()).toEqual({})

    handle('/en/jobs', {
      cookie: 'en',
      alternateLinks: true,
      siteUrl: () => 'https://karriere.example',
    })
    expect(setHeaders().link).toContain(
      '<https://karriere.example/en/jobs>; rel="alternate"; hreflang="en"'
    )
  })
})
