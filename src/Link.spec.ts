import { describe, expect, it } from 'vitest'
import { isInternalHref, splitHref } from './Link.js'

describe('isInternalHref', () => {
  it('treats absolute paths as internal', () => {
    expect(isInternalHref('/de/kontakt')).toBe(true)
    expect(isInternalHref('/kontakt?page=2#team')).toBe(true)
    expect(isInternalHref('/')).toBe(true)
  })

  it('treats relative hrefs as external', () => {
    expect(isInternalHref('foo')).toBe(false)
    expect(isInternalHref('null')).toBe(false)
    expect(isInternalHref('./foo')).toBe(false)
    expect(isInternalHref('../foo')).toBe(false)
    expect(isInternalHref('?page=2')).toBe(false)
  })

  it('treats absolute URLs and protocol-relative URLs as external', () => {
    expect(isInternalHref('https://example.com')).toBe(false)
    expect(isInternalHref('http://example.com')).toBe(false)
    expect(isInternalHref('//example.com')).toBe(false)
    expect(isInternalHref('www.example.com')).toBe(false)
  })

  it.each([
    'mailto:info@example.com',
    'tel:+49123456',
    'sms:+49123456',
    'whatsapp://send?text=hi',
    'ftp://example.com/file.zip',
    'HTTPS://example.com',
    'web+custom:payload',
    'javascript:void(0)',
  ])('treats %j, which has a URI scheme, as external', (href) => {
    expect(isInternalHref(href)).toBe(false)
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
