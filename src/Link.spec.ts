import { describe, expect, it } from 'vitest'
import { isInternalHref, splitHref } from './Link.js'

describe('isInternalHref', () => {
  it('treats absolute paths as internal', () => {
    expect(isInternalHref('/de/kontakt')).toBe(true)
    expect(isInternalHref('/kontakt?page=2#team')).toBe(true)
  })

  it('treats absolute URLs and protocol-relative URLs as external', () => {
    expect(isInternalHref('https://nexum.com')).toBe(false)
    expect(isInternalHref('http://nexum.com')).toBe(false)
    expect(isInternalHref('//nexum.com')).toBe(false)
    expect(isInternalHref('www.nexum.com')).toBe(false)
  })

  it('treats mailto and tel as external', () => {
    expect(isInternalHref('mailto:info@nexum.com')).toBe(false)
    expect(isInternalHref('tel:+49123456')).toBe(false)
  })

  it('treats hash-only hrefs and empty hrefs as external', () => {
    expect(isInternalHref('#')).toBe(false)
    expect(isInternalHref('#team')).toBe(false)
    expect(isInternalHref('')).toBe(false)
    expect(isInternalHref(undefined)).toBe(false)
  })
})

describe('splitHref', () => {
  it('splits a bare pathname', () => {
    expect(splitHref('/de/kontakt')).toEqual({
      pathname: '/de/kontakt',
      search: undefined,
      hash: undefined,
    })
  })

  it('splits query parameters into a search object', () => {
    expect(splitHref('/de/insights?page=2&filter_1=tech')).toEqual({
      pathname: '/de/insights',
      search: { page: 2, filter_1: 'tech' },
      hash: undefined,
    })
  })

  it('splits the hash without its leading marker', () => {
    expect(splitHref('/de/team#leadership')).toEqual({
      pathname: '/de/team',
      search: undefined,
      hash: 'leadership',
    })
  })

  it('splits query and hash together', () => {
    expect(splitHref('/de/insights?page=3#list')).toEqual({
      pathname: '/de/insights',
      search: { page: 3 },
      hash: 'list',
    })
  })

  it('decodes percent-encoded search values', () => {
    expect(splitHref('/de/insights?filter_1=Customer%20Experience')).toEqual({
      pathname: '/de/insights',
      search: { filter_1: 'Customer Experience' },
      hash: undefined,
    })
  })

  it('keeps an empty search out of the result', () => {
    expect(splitHref('/de/kontakt?')).toEqual({
      pathname: '/de/kontakt',
      search: undefined,
      hash: undefined,
    })
  })
})
