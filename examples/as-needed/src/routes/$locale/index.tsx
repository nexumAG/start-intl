import { createFileRoute } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { Page } from '../../components/Page'
import { Link } from '../../i18n'

export const Route = createFileRoute('/$locale/')({ component: Home })

function Home() {
  const t = useTranslations('Home')

  return (
    <Page title={t('title')} description={t('description')}>
      <Link
        href="/about"
        className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        {t('cta')}
      </Link>
      <Link
        href="https://github.com/nexumAG/start-intl#readme"
        className="text-sm/6 font-semibold"
      >
        {t('docs')} <span aria-hidden="true">→</span>
      </Link>
    </Page>
  )
}
