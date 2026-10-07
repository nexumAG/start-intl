# 🌍 start-intl

<img align="right" src="https://avatars.githubusercontent.com/u/2322771?s=200&v=4" width="90" alt="nexum" />

Locale routing for [`use-intl`](https://next-intl.dev/docs/environments/core-library) on [TanStack Start](https://tanstack.com/start/latest): locale prefixes, detection, the locale cookie and a locale-aware `Link`. Translation stays plain `use-intl`.

> [!IMPORTANT]
> **Unofficial & unaffiliated.** This is a community package maintained by [nexum AG](https://www.nexum.com). It is **not** developed, endorsed, or supported by TanStack, and nexum AG is not affiliated with TanStack in any way. "TanStack" is a trademark of its respective owner and is used here only to describe what this package integrates with. For the official framework, see [tanstack.com](https://tanstack.com).

> [!WARNING]
> **Beta:** until 1.0.0, any release may break the API, so pin the exact version. Not supported: `localePrefix: 'never'`, locale per domain, translated pathnames.

👉 [Getting Started](#-getting-started)

🧭 [How a request gets its locale](#-how-a-request-gets-its-locale)

🧩 [Usage](#-usage)

🔧 [Lower-level API](#-lower-level-api)

🧪 [Local development](#-local-development)

🐾 [Useful links](#-useful-links)

## 👉 Getting Started

```bash
npm install @nexum-ag/start-intl
```

> [!NOTE]
> `@tanstack/react-router`, `@tanstack/react-start`, `react` 19 and `use-intl` 4 are peer dependencies, so the package uses your app's copies.

## 🧭 How a request gets its locale

The first match wins:

1. The locale prefix in the URL (`/en/jobs`)
2. `localeOverride`, if the middleware has one
3. The locale cookie, if it names one of `locales`
4. The `Accept-Language` header (sorted by `q`, `q=0` dropped, `en-US` matches `en`)
5. `defaultLocale`

Only page requests are routed. Paths starting with `/api/`, `/_serverFn/`, `/_build/`, `/assets/`, `/@` or `/node_modules/`, and static files (`.ico`, `.png`, `.svg`, `.js`, `.css`, `.xml`, `.pdf`, …), pass through untouched. `/wp-admin.php` still counts as a page, so it gets the localised 404.

## 🧩 Usage

### `defineRouting(config)`

| Param | Type | Default | |
|---|---|---|---|
| `locales` | `readonly string[]` | required | Every supported locale. A URL's first segment has to match one of them exactly. The `Locale` type is inferred from this list. |
| `defaultLocale` | one of `locales` | required | Used when nothing else matches. With `as-needed`, its URLs have no prefix. |
| `localePrefix` | `'always' \| 'as-needed'` | required | `always`: every page URL has a prefix, and an unprefixed URL redirects (307) to the detected locale. `as-needed`: the default locale is served unprefixed, `/de/jobs` redirects to `/jobs`, and the other locales keep their prefix. |
| `cookie.name` | `string` | `'NEXT_LOCALE'` | The cookie that stores the visitor's choice. The default is next-intl's name, so existing cookies keep working. |
| `cookie.maxAge` | `number` (seconds) | none | How long the cookie lasts. Without it, it's a session cookie. |

```ts
// i18n/routing.ts
import { defineRouting } from '@nexum-ag/start-intl'

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'as-needed',
  cookie: { name: 'NEXT_LOCALE', maxAge: 60 * 60 * 24 * 365 },
})

export type Locale = (typeof routing.locales)[number]
```

### `createLocaleMiddleware(routing, options?)`

A TanStack Start request middleware. On a page request it:

- redirects a trailing slash with a 308 (`/en/jobs/` → `/en/jobs`, query kept)
- redirects to the right prefix with a 307
- sets the locale cookie, following next-intl's rules: only on document requests (`Sec-Fetch-Dest: document`, or no such header), and only when the locale differs from the cookie or, if there's no cookie, from `Accept-Language`

| Param | Type | Default | |
|---|---|---|---|
| `routing` | `Routing` | required | The result of `defineRouting`. |
| `options.localeOverride` | `(url: URL) => Locale \| undefined` | none | Called on every request. A locale it returns beats the cookie and `Accept-Language`, but not a URL prefix, and is never written to the cookie. Values outside `locales` are ignored. Use it for a CMS preview that has its own language, like the Storyblok Visual Editor. |
| `options.alternateLinks` | `boolean` | `false` | Sends a `Link` header with an hreflang alternate for each locale, plus `x-default` (the unprefixed URL), query included. It's only sent on pages that aren't redirected. Leave it off if your page head already renders the alternates. |
| `options.siteUrl` | `() => string` | the request's origin | Called on every request. The origin for the alternate links, without a trailing slash. Set it when the app runs behind a proxy, where the request URL can have the wrong host or `http`. Only used with `alternateLinks`. |

```ts
// app/start.ts
import { createStart } from '@tanstack/react-start'
import { createLocaleMiddleware } from '@nexum-ag/start-intl/middleware'
import { routing } from '@/i18n/routing'

function storyblokEditorLocale(url: URL) {
  if (!url.searchParams.has('_storyblok')) {
    return undefined
  }

  const language = url.searchParams.get('_storyblok_lang')

  return routing.locales.find((locale) => locale === language) ?? routing.defaultLocale
}

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createLocaleMiddleware(routing, {
      localeOverride: storyblokEditorLocale,
      alternateLinks: true,
      siteUrl: () => process.env.SITE_URL ?? 'https://example.com',
    }),
  ],
}))
```

### `createLocaleRewrite(routing)`

Returns `{ input, output }` for the router's `rewrite` option. The route tree always starts with a `$locale` segment. With `as-needed`, `input` maps `/jobs` onto the `/de/jobs` route and `output` drops `/de` from rendered URLs. With `always` both do nothing.

| Param | Type | |
|---|---|---|
| `routing` | `Routing` | The result of `defineRouting`. |

```ts
// app/router.tsx
import { createRouter } from '@tanstack/react-router'
import { createLocaleRewrite } from '@nexum-ag/start-intl'

export function getRouter() {
  return createRouter({ routeTree, rewrite: createLocaleRewrite(routing) })
}
```

### `syncLocaleCookie(router, routing)`

Writes the locale cookie whenever a client-side navigation changes the locale, since those navigations never reach the middleware. It works for every way of navigating: this package's `Link`, the router's own `Link` (`<Link to="." params={{ locale: 'en' }}>`) and `router.navigate`. On the server it does nothing. It returns the router's unsubscribe function.

```ts
// app/router.tsx
import { createLocaleRewrite, syncLocaleCookie } from '@nexum-ag/start-intl'

export function getRouter() {
  const router = createRouter({ routeTree, rewrite: createLocaleRewrite(routing) })
  syncLocaleCookie(router, routing)

  return router
}
```

### `createLink(routing)`

Returns a `Link` component that takes a plain `href` string, the way CMS links arrive. It needs a use-intl `IntlProvider` above it.

Inside a `RouterProvider`, an href that points to a page on the same origin renders the router's `Link`. Root-relative hrefs (`/jobs`) are prefixed with the target locale, as in next-intl. Relative hrefs (`foo`, `../foo`, `?page=2`, `#top`) first resolve against the current URL the way a browser and `next/link` resolve them, so `foo` on `/de/jobs` links to `/de/foo`. They don't use the router's own relative `to`, which would give `/de/jobs/foo`. The query is parsed with the router's own `parseSearch`, so `?page=2` stays `?page=2`.

Everything else renders a plain `<a>` with the href unchanged: URLs with a scheme (`https:`, `mailto:`, `tel:`), protocol-relative `//host`, files and other non-page paths (see above), and any href rendered outside a `RouterProvider`.

| Prop | Type | Default | |
|---|---|---|---|
| `href` | `string` | required | With or without a locale prefix, query and hash. |
| `locale` | `Locale` | the href's prefix, else the current locale | The locale to link to. [`syncLocaleCookie`](#synclocalecookierouter-routing) remembers the switch. |
| `activeOptions` | `ActiveOptions` | `{ exact: true }` | Passed to the router's `Link`. With the default, the home link isn't marked active on every page. |
| any `<a>` attribute | | | Passed through, including `onClick`. |

```tsx
// i18n/Link.tsx
import { createLink } from '@nexum-ag/start-intl/react'
import { routing } from '@/i18n/routing'

export const Link = createLink(routing)

// <Link href="/jobs?page=2">Jobs</Link>          → /jobs?page=2 (de, as-needed)
// <Link href="/de/jobs" locale="en">English</Link> → /en/jobs
```

### `parseLocale(locale, routing)`

Returns `locale` typed as `Locale`, or throws the router's `notFound()` if it isn't one of `locales`. Exported from `@nexum-ag/start-intl/react`.

| Param | Type | |
|---|---|---|
| `locale` | `string` | Usually the `$locale` route param. |
| `routing` | `Routing` | The result of `defineRouting`. |

```ts
// app/routes/$locale.tsx
export const Route = createFileRoute('/$locale')({
  params: { parse: ({ locale }) => ({ locale: parseLocale(locale, routing) }) },
})
```

## 🔧 Lower-level API

### `resolveRequestRouting(request, routing)`

The pure function behind the middleware. Call it yourself when the locale handling has to run inside your own middleware, for example after redirects or basic auth.

| Param | Type | |
|---|---|---|
| `request.url` | `string` | The full request URL. |
| `request.cookieLocale` | `string` | The value of the locale cookie. |
| `request.acceptLanguage` | `string` | The `Accept-Language` header. |
| `request.secFetchDest` | `string` | The `Sec-Fetch-Dest` header. Anything other than `document` skips the cookie. |
| `request.localeOverride` | `string` | See `options.localeOverride` above. Pass the value, not the function. |
| `request.siteUrl` | `string` | Origin for `alternateLinks`. Defaults to the URL's origin. |
| `routing` | `Routing` | The result of `defineRouting`. |

It returns `{}` for requests that aren't pages, otherwise:

| Field | Type | |
|---|---|---|
| `redirect` | `{ location: string; status: 307 \| 308 }` | Set when the request has to move. `location` is always a same-origin path. |
| `cookie` | `string` | The locale to write. Turn it into a header with `serializeLocaleCookie(cookie, routing)`. It can be set together with `redirect`. |
| `alternateLinks` | `string` | A ready `Link` header value. Only set when there's no redirect. |

```ts
const { redirect, cookie } = resolveRequestRouting(
  {
    url: request.url,
    cookieLocale: getCookie(routing.cookie.name),
    acceptLanguage: request.headers.get('accept-language') ?? undefined,
    secFetchDest: request.headers.get('sec-fetch-dest') ?? undefined,
  },
  routing
)
```

### Helpers

All exported from `@nexum-ag/start-intl` and pure.

| Function | Returns |
|---|---|
| `isLocalisedPath(pathname)` | Whether the path is a page that gets locale routing. |
| `getLocalePrefix(pathname, routing)` | The locale in the first segment, or `undefined`. |
| `stripLocalePrefix(pathname, routing)` | The path without its locale prefix (`/en` → `/`). |
| `getLocalisedPath(path, locale, routing)` | The URL path for `locale`, honouring `as-needed`. |
| `getAcceptLanguageLocale(header, routing)` | The best match from an `Accept-Language` header, else `defaultLocale`. |
| `serializeLocaleCookie(locale, routing)` | A `Set-Cookie` value using `cookie.name` and `cookie.maxAge`. |

## 🧪 Local development

Requires Node 22 or 24.

```bash
npm install
npm run build      # dist/ (ESM + types)
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # biome
npm run check:pkg  # build, then publint + are-the-types-wrong
```

### Tech stack

- [**TypeScript**](https://www.typescriptlang.org/): `tsc` builds ESM and types, no bundler.
- [**Vitest**](https://vitest.dev/): unit tests, jsdom + Testing Library.
- [**Biome**](https://biomejs.dev/): linting and formatting.
- Published to [**npm**](https://www.npmjs.com/package/@nexum-ag/start-intl) on each GitHub release (the release tag has to match the version in `package.json`).

## 🐾 Useful links

- [use-intl docs](https://next-intl.dev/docs/environments/core-library)
- [TanStack Start middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [TanStack Router URL rewrites](https://tanstack.com/router/latest/docs/framework/react/guide/url-rewrites)
- [next-intl's routing middleware](https://next-intl.dev/docs/routing/middleware), whose redirect and cookie rules this package follows

## 📄 License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE).

Copyright © nexum AG and its associated companies.
