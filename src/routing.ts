export type Routing<L extends string = string> = {
  locales: readonly L[]
  defaultLocale: L
  localePrefix: 'always' | 'as-needed'
  cookie: {
    name: string
    /** Seconds; without it the cookie lasts for the browser session. */
    maxAge?: number
  }
}

export type RoutingConfig<L extends string> = Omit<
  Routing<L>,
  'defaultLocale' | 'cookie'
> & {
  defaultLocale: NoInfer<L>
  cookie?: Partial<Routing['cookie']>
}

export function defineRouting<const L extends string>({
  cookie,
  ...config
}: RoutingConfig<L>): Routing<L> {
  return { ...config, cookie: { name: 'NEXT_LOCALE', ...cookie } }
}
