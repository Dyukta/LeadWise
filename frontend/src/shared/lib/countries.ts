import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/mobile'

type Country = { code: CountryCode; dial: string; name: string; flag: string }

export const DEFAULT_COUNTRY: CountryCode = 'IN'

const names = new Intl.DisplayNames(['en'], { type: 'region' })

const flagOf = (code: string) => `fi fi-${code.toLowerCase()}`

export const COUNTRIES: Country[] = getCountries()
  .map((code) => ({
    code,
    dial: `+${getCountryCallingCode(code)}`,
    name: names.of(code) ?? code,
    flag: flagOf(code)
  }))
  .sort((a, b) =>
    a.code === DEFAULT_COUNTRY ? -1 : b.code === DEFAULT_COUNTRY ? 1 : a.name.localeCompare(b.name)
  )
