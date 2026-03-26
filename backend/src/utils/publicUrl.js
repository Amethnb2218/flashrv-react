const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const collectCandidates = (...values) =>
  values
    .flatMap((value) => String(value || '').split(','))
    .map((value) => trimTrailingSlash(value))
    .filter(Boolean);

const resolvePublicBaseUrl = (...values) => {
  const candidates = collectCandidates(...values);

  for (const candidate of candidates) {
    if (!isAbsoluteHttpUrl(candidate)) continue;

    try {
      const url = new URL(candidate);
      return trimTrailingSlash(`${url.protocol}//${url.host}${url.pathname}`);
    } catch (_) {
      // Ignore malformed values and continue to the next candidate.
    }
  }

  return null;
};

module.exports = {
  trimTrailingSlash,
  resolvePublicBaseUrl,
};
