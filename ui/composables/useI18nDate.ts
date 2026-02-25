import {useI18n} from 'vue-i18n'

/**
 * Shared helpers for turning mixed timestamp inputs (Date, ISO string, seconds or ms numbers)
 * into localized strings that match the chat design.
 */

type AcceptableDateInput = Date | number | string | null | undefined

function normalizeNumericTimestamp(value: number) {
  return value < 1e12 ? value * 1000 : value
}

/**
 * Accepts a loose timestamp (Date, numeric seconds/milliseconds, ISO string)
 * and returns a valid Date when possible, otherwise null.
 */
function toDate(value: AcceptableDateInput): Date | null {
  if (value === undefined || value === null) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number') {
    const date = new Date(normalizeNumericTimestamp(value))
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') {
      return null
    }

    const numericValue = Number(trimmed)
    const date = Number.isNaN(numericValue)
      ? new Date(trimmed)
      : new Date(normalizeNumericTimestamp(numericValue))

    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(value as any)
  return Number.isNaN(date.getTime()) ? null : date
}

export function useI18nDate() {
  const {locale} = useI18n()

  /**
   * Formats messages as "HH:MM, DD Mon" in the current locale, adding the year when needed.
   */
  const formatChatTimestamp = (value: AcceptableDateInput): string => {
    const date = toDate(value)
    if (!date) {
      return value != null ? String(value) : ''
    }

    const localeValue = locale.value || undefined
    const now = new Date()
    const dateFormatter = new Intl.DateTimeFormat(
      localeValue,
      date.getFullYear() === now.getFullYear()
        ? {day: '2-digit', month: 'short'}
        : {day: '2-digit', month: 'short', year: 'numeric'}
    )
    const timeFormatter = new Intl.DateTimeFormat(localeValue, {
      hour: '2-digit',
      minute: '2-digit'
    })

    return `${timeFormatter.format(date)}, ${dateFormatter.format(date)}`
  }

  return {
    toDate,
    formatChatTimestamp,
  }
}
