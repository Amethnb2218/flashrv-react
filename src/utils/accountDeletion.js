export const ACCOUNT_DELETION_GRACE_DAYS = 30
const ACCOUNT_DELETION_STORAGE_PREFIX = 'flashrv_account_deletion'

const getUserScope = (user) => {
  if (!user || typeof user !== 'object') return 'guest'
  return user.id || user._id || user.email || user.phoneNumber || user.phone || 'guest'
}

export const getAccountDeletionStorageKey = (user) =>
  `${ACCOUNT_DELETION_STORAGE_PREFIX}:${getUserScope(user)}`

export function buildAccountDeletionRecord(user, graceDays = ACCOUNT_DELETION_GRACE_DAYS) {
  const requestedAt = new Date()
  const scheduledDeletionAt = new Date(requestedAt)
  scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + Number(graceDays || ACCOUNT_DELETION_GRACE_DAYS))

  return {
    userScope: getUserScope(user),
    userId: user?.id || user?._id || null,
    email: user?.email || null,
    phoneNumber: user?.phoneNumber || user?.phone || null,
    requestedAt: requestedAt.toISOString(),
    scheduledDeletionAt: scheduledDeletionAt.toISOString(),
    graceDays: Number(graceDays || ACCOUNT_DELETION_GRACE_DAYS),
  }
}

export function readAccountDeletionRecord(user) {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(getAccountDeletionStorageKey(user))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeAccountDeletionRecord(user, record) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(getAccountDeletionStorageKey(user), JSON.stringify(record))
  } catch {
    // Best-effort only: the server remains the source of truth if available.
  }
}

export function clearAccountDeletionRecord(user) {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(getAccountDeletionStorageKey(user))
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function isAccountDeletionPending(record, now = new Date()) {
  if (!record?.scheduledDeletionAt) return false
  const scheduledDeletionAt = new Date(record.scheduledDeletionAt)
  if (Number.isNaN(scheduledDeletionAt.getTime())) return false
  return scheduledDeletionAt.getTime() > now.getTime()
}

export function formatDeletionDeadline(record) {
  if (!record?.scheduledDeletionAt) return ''
  const scheduledDeletionAt = new Date(record.scheduledDeletionAt)
  if (Number.isNaN(scheduledDeletionAt.getTime())) return ''
  return scheduledDeletionAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
