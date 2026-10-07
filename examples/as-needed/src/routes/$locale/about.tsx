import { createFileRoute } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { Page } from '../../components/Page'
import { Link } from '../../i18n'

export const Route = createFileRoute('/$locale/about')({ component: About })

function About() {
  const t = useTranslations('About')

  return (
    <Page title={t('title')} description={t('description')}>
      <Link href="/" className="text-sm/6 font-semibold">
        <span aria-hidden="true">←</span> {t('back')}
      </Link>
    </Page>
  )
}
