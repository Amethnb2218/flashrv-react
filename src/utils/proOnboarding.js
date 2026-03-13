const PRO_ONBOARDING_DRAFT_PREFIX = 'flashrv_pro_onboarding_draft'

export function normalizeUserRole(role) {
  return String(role || '').trim().toUpperCase()
}

export function normalizeUserStatus(status) {
  return String(status || '').trim().toUpperCase()
}

export function isProUser(user) {
  return normalizeUserRole(user?.role) === 'PRO'
}

export function hasProSalon(user) {
  if (!user || typeof user !== 'object') return false
  if (typeof user.hasSalon === 'boolean') return user.hasSalon
  return Boolean(user.salonId || user?.salon?.id)
}

function getDraftOwnerKey(user) {
  return String(user?.id || user?.email || '').trim()
}

export function getProOnboardingDraftKey(user) {
  const ownerKey = getDraftOwnerKey(user)
  return ownerKey ? `${PRO_ONBOARDING_DRAFT_PREFIX}:${ownerKey}` : null
}

export function readProOnboardingDraft(user) {
  if (typeof window === 'undefined') return null
  const storageKey = getProOnboardingDraftKey(user)
  if (!storageKey) return null

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (_) {
    return null
  }
}

export function writeProOnboardingDraft(user, draft) {
  if (typeof window === 'undefined') return
  const storageKey = getProOnboardingDraftKey(user)
  if (!storageKey) return

  const nextDraft =
    draft && typeof draft === 'object'
      ? {
          businessType: draft.businessType || null,
          form: draft.form && typeof draft.form === 'object' ? draft.form : {},
          updatedAt: new Date().toISOString(),
        }
      : null

  try {
    if (!nextDraft) {
      window.localStorage.removeItem(storageKey)
      return
    }
    window.localStorage.setItem(storageKey, JSON.stringify(nextDraft))
  } catch (_) {
    // Ignore storage errors to avoid blocking onboarding.
  }
}

export function clearProOnboardingDraft(user) {
  if (typeof window === 'undefined') return
  const storageKey = getProOnboardingDraftKey(user)
  if (!storageKey) return

  try {
    window.localStorage.removeItem(storageKey)
  } catch (_) {
    // Ignore storage errors to avoid blocking logout or redirects.
  }
}

export function getProRedirectPath(user) {
  if (!isProUser(user)) return null
  if (!hasProSalon(user)) {
    const draft = readProOnboardingDraft(user)
    const businessType = String(draft?.businessType || '').trim().toUpperCase()
    return businessType ? `/pro/onboarding?businessType=${businessType}` : '/pro/onboarding'
  }

  return normalizeUserStatus(user?.status) === 'APPROVED'
    ? '/pro/dashboard'
    : '/pro/pending'
}
