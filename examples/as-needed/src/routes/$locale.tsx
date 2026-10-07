import { parseLocale } from '@nexum-ag/start-intl/react'
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { IntlProvider, useLocale, useTranslations } from 'use-intl'
import { Link, messages, routing } from '../i18n'

export const Route = createFileRoute('/$locale')({
  params: { parse: ({ locale }) => ({ locale: parseLocale(locale, routing) }) },
  component: LocaleLayout,
})

function LocaleLayout() {
  const { locale } = Route.useParams()

  return (
    <IntlProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="Europe/Berlin"
    >
      <Header />
      <Outlet />
    </IntlProvider>
  )
}

const navLink =
  'text-sm/6 font-semibold text-gray-900 hover:text-indigo-600 data-[status=active]:text-indigo-600'

function Header() {
  const t = useTranslations('Nav')
  const { pathname } = useLocation()
  const otherLocale = useLocale() === 'en' ? 'de' : 'en'

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 -m-1.5 p-1.5">
          <span className="size-7 rounded-lg bg-indigo-600" />
          <span className="font-semibold tracking-tight">start-intl</span>
        </Link>
        <div className="flex gap-x-8">
          <Link href="/" className={navLink}>
            {t('home')}
          </Link>
          <Link href="/about" className={navLink}>
            {t('about')}
          </Link>
        </div>
        <Link
          href={pathname}
          locale={otherLocale}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
        >
          {t('switch')}
        </Link>
      </nav>
    </header>
  )
}
