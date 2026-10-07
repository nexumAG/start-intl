# Changelog

All notable changes to this package are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Betas may
break the API; from 1.0.0 on, breaking changes require a major version.

## [1.0.0-beta.3] - 2026-10-07

### Added

- `syncLocaleCookie(router, routing)` writes the locale cookie whenever a client-side
  navigation changes the locale, including through the router's own `Link` and
  `router.navigate`.

### Changed

- **Breaking:** `Link` no longer writes the locale cookie itself. Call
  `syncLocaleCookie(router, routing)` in `getRouter` to keep remembering locale switches.

### Fixed

- `Link` resolves relative hrefs against the current URL, as a browser and `next/link` do,
  and navigates to them through the router. `foo` on `/de/jobs` was prefixed with the locale
  and became `/defoo`; it now links to `/de/foo`.

## [1.0.0-beta.2] - 2026-10-06

### Fixed

- `createLink` treats an href with any URI scheme (`sms:`, `whatsapp:`, `ftp:`, …) as
  external. Before, only `http`, `https`, `mailto` and `tel` were, so other schemes became
  locale-prefixed router links.

## [1.0.0-beta.1] - 2026-10-06

### Added

- `defineRouting`, `createLocaleMiddleware`, `createLocaleRewrite`, `createLink` and
  `parseLocale`, consolidating the locale routing copied into nexum's TanStack Start sites.

[1.0.0-beta.3]: https://github.com/nexumAG/start-intl/releases/tag/v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/nexumAG/start-intl/releases/tag/v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/nexumAG/start-intl/releases/tag/v1.0.0-beta.1
