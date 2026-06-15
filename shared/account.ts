import type { UserRole } from './types'

export const ACCOUNT_AUTH_DOMAIN = 'artstyle-lab.local'
export const REGISTRATION_AUTH_DOMAIN = 'ai-artstyle-lab.com'

export function normalizeAccountCode(value: string) {
  return value.trim().toLowerCase()
}

export function isStudentAccountCode(value: string) {
  return /^[0-9]{8}$/.test(normalizeAccountCode(value))
}

export function isTeacherAccountCode(value: string) {
  return /^[0-9]{7}$/.test(normalizeAccountCode(value))
}

export function inferRoleFromAccountCode(value: string): UserRole | null {
  if (isStudentAccountCode(value)) {
    return 'student'
  }

  if (isTeacherAccountCode(value)) {
    return 'teacher'
  }

  return null
}

export function isRegistrableAccountCode(value: string) {
  return Boolean(inferRoleFromAccountCode(value))
}

export function accountCodeToAuthEmail(value: string) {
  const accountCode = normalizeAccountCode(value)
  return `u${accountCode}@${REGISTRATION_AUTH_DOMAIN}`
}

export function legacyAccountCodeToAuthEmail(value: string) {
  const accountCode = normalizeAccountCode(value)
  return `legacy-${accountCode}@${ACCOUNT_AUTH_DOMAIN}`
}

export function authEmailsForAccountCode(value: string) {
  return [
    legacyAccountCodeToAuthEmail(value),
    accountCodeToAuthEmail(value)
  ]
}

export function accountCodeFromAuthEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const match = normalized.match(/^legacy-(.+)@artstyle-lab\.local$/)
  if (match?.[1]) {
    return match[1]
  }

  return normalized.split('@')[0] || normalized
}
