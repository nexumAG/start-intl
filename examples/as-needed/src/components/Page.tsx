import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { routing } from '../i18n'

const blobShape =
  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'

export function Page({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="relative isolate overflow-hidden px-6 pt-14 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          style={{ clipPath: blobShape }}
          className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
        />
      </div>
      <div className="mx-auto max-w-2xl py-32 text-center sm:py-40">
        <p className="mb-8 inline-flex rounded-full px-3 py-1 font-mono text-sm/6 text-gray-600 ring-1 ring-gray-900/10">
          localePrefix: '{routing.localePrefix}'
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          {title}
        </h1>
        <p className="mt-8 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
          {description}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          {children}
        </div>
        <RouteDetails />
      </div>
    </main>
  )
}

function RouteDetails() {
  const t = useTranslations('Details')
  const url = useLocation({ select: (location) => location.publicHref })
  const rows = [
    [t('url'), url],
    [t('locale'), useLocale()],
  ]

  return (
    <dl className="mx-auto mt-16 max-w-sm divide-y divide-gray-900/5 rounded-xl bg-white/60 text-left text-sm/6 shadow-xs ring-1 ring-gray-900/5 backdrop-blur">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-x-4 px-4 py-3">
          <dt className="text-gray-500">{label}</dt>
          <dd className="font-mono text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
