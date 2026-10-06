import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { afterEach, describe, expect, it } from 'vitest'
import { createLink } from './Link.js'
import { createLocaleRewrite } from './request.js'
import { defineRouting, type Routing } from './routing.js'

const ALWAYS = defineRouting({
  locales: ['de', 'en', 'es'],
  defaultLocale: 'de',
  localePrefix: 'always',
})

const AS_NEEDED = defineRouting({ ...ALWAYS, localePrefix: 'as-needed' })

const Link = createLink(ALWAYS)

function withIntl(locale: string, children: ReactNode) {
  return (
    <IntlProvider locale={locale} messages={{}} timeZone="Europe/Berlin">
      {children}
    </IntlProvider>
  )
}

function renderAtLocale(
  locale: string,
  children: ReactNode,
  routing: Routing = ALWAYS,
  path = `/${locale}`
) {
  const rootRoute = createRootRoute()
  const localeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/$locale',
    component: () => withIntl(locale, children),
  })
  const localeIndexRoute = createRoute({
    getParentRoute: () => localeRoute,
    path: '/',
  })
  const localeSplatRoute = createRoute({
    getParentRoute: () => localeRoute,
    path: '/$',
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      localeRoute.addChildren([localeIndexRoute, localeSplatRoute]),
    ]),
    rewrite: createLocaleRewrite(routing),
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(<RouterProvider router={router} />)
}

async function hrefOf(name: string) {
  const link = await screen.findByRole('link', { name })

  return link.getAttribute('href')
}

afterEach(cleanup)

describe('<Link>', () => {
  it('prefixes an internal href with the active locale and keeps query and hash', async () => {
    renderAtLocale('de', <Link href="/foo?tab=details#y">Foo</Link>)

    expect(await hrefOf('Foo')).toBe('/de/foo?tab=details#y')
  })

  it('keeps numeric query values unquoted, as the CMS wrote them', async () => {
    renderAtLocale('de', <Link href="/foo?page=2">Foo</Link>)

    expect(await hrefOf('Foo')).toBe('/de/foo?page=2')
  })

  it('keeps a text query value readable', async () => {
    renderAtLocale(
      'de',
      <Link href="/insights?page=2&filter_1=Customer%20Experience">Foo</Link>
    )

    expect(await hrefOf('Foo')).toBe(
      '/de/insights?page=2&filter_1=Customer+Experience'
    )
  })

  it('swaps the locale prefix when an explicit locale is given', async () => {
    renderAtLocale(
      'de',
      <Link href="/de/kontakt" locale="en">
        Kontakt
      </Link>
    )

    expect(await hrefOf('Kontakt')).toBe('/en/kontakt')
  })

  it('keeps the locale an href already carries', async () => {
    renderAtLocale('de', <Link href="/en/career">Career</Link>)

    expect(await hrefOf('Career')).toBe('/en/career')
  })

  it('renders a plain anchor for a file path', async () => {
    renderAtLocale('de', <Link href="/assets/brochure.pdf">Brochure</Link>)

    expect(await hrefOf('Brochure')).toBe('/assets/brochure.pdf')
  })

  it('links to the locale home page when the href has no path segment', async () => {
    renderAtLocale('de', <Link href="/">Home</Link>)

    expect(await hrefOf('Home')).toBe('/de')
  })

  it('remembers a language switch in the locale cookie', async () => {
    renderAtLocale(
      'de',
      <>
        <Link href="/">Deutsch</Link>
        <Link href="/" locale="en">
          English
        </Link>
      </>
    )

    fireEvent.click(await screen.findByRole('link', { name: 'Deutsch' }))
    expect(document.cookie).not.toContain('NEXT_LOCALE')

    fireEvent.click(await screen.findByRole('link', { name: 'English' }))
    expect(document.cookie).toContain('NEXT_LOCALE=en')
  })

  it('renders a plain anchor for external hrefs', async () => {
    renderAtLocale('de', <Link href="https://nexum.com">nexum</Link>)

    expect(await hrefOf('nexum')).toBe('https://nexum.com')
  })

  it('only marks the exact page active unless told otherwise', async () => {
    renderAtLocale(
      'de',
      <>
        <Link href="/">Home</Link>
        <Link href="/" activeOptions={{ exact: false }}>
          Home section
        </Link>
      </>,
      ALWAYS,
      '/de/foo'
    )

    const status = async (name: string) =>
      (await screen.findByRole('link', { name })).dataset.status

    expect(await status('Home')).toBeUndefined()
    expect(await status('Home section')).toBe('active')
  })

  it('renders a plain anchor without a router', () => {
    render(withIntl('de', <Link href="/foo?page=2">Foo</Link>))

    expect(screen.getByRole('link', { name: 'Foo' }).getAttribute('href')).toBe(
      '/foo?page=2'
    )
  })
})

describe('<Link> with as-needed', () => {
  const AsNeededLink = createLink(AS_NEEDED)

  it('leaves the default locale out of the URL', async () => {
    renderAtLocale(
      'de',
      <>
        <AsNeededLink href="/">Home</AsNeededLink>
        <AsNeededLink href="/de/jobs">Jobs</AsNeededLink>
        <AsNeededLink href="/jobs" locale="en">
          English jobs
        </AsNeededLink>
      </>,
      AS_NEEDED
    )

    expect(await hrefOf('Home')).toBe('/')
    expect(await hrefOf('Jobs')).toBe('/jobs')
    expect(await hrefOf('English jobs')).toBe('/en/jobs')
  })
})
