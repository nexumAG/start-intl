import {
  createRootRoute,
  HeadContent,
  Scripts,
  useParams,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import styles from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'start-intl' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  shellComponent: Shell,
})

function Shell({ children }: { children: ReactNode }) {
  const { locale } = useParams({ strict: false })

  return (
    <html lang={locale} className="h-full bg-white antialiased">
      <head>
        <HeadContent />
      </head>
      <body className="h-full text-gray-900">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
