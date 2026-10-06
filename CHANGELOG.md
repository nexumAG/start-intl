# Changelog

All notable changes to this package are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Betas may
break the API; from 1.0.0 on, breaking changes require a major version.

## [Unreleased]

### Fixed

- `createLink` treats an href with any URI scheme (`sms:`, `whatsapp:`, `ftp:`, …) as
  external. Before, only `http`, `https`, `mailto` and `tel` were, so other schemes became
  locale-prefixed router links.

## [1.0.0-beta.1] - 2026-10-06

### Added

- `defineRouting`, `createLocaleMiddleware`, `createLocaleRewrite`, `createLink` and
  `parseLocale`, consolidating the locale routing copied into nexum's TanStack Start sites.

[1.0.0-beta.1]: https://github.com/nexumAG/start-intl/releases/tag/v1.0.0-beta.1
