/**
 * Country id convention.
 *
 * Country features come from world-atlas, whose geometry ids are numeric
 * ISO 3166-1 codes serialised as zero-padded 3-character strings ('032'
 * Argentina, '076' Brazil, '840' United States). Every id-keyed input the
 * engine accepts — region lists, `setCountryData` keys, `focusOnCountry`,
 * `setActiveCountry`, `setCountryLabels`, story scenes — is passed through
 * `normalizeCountryId`, so the shorter '32' or the number 32 work too.
 * Non-numeric ids (custom TopoJSON with alpha codes) are left untouched.
 */

/** '32' | 32 → '032'; '840' → '840'; 'US' → 'US'. */
export const normalizeCountryId = (id: string | number): string => {
  const text = String(id).trim();
  return /^\d{1,3}$/.test(text) ? text.padStart(3, '0') : text;
};

/**
 * Re-key an id-indexed record with normalised ids. Returns the same object
 * when nothing changes so callers can keep referential equality.
 */
export const normalizeCountryKeys = <T>(
  map: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> => {
  let changed = false;
  const next: Record<string, T> = {};
  for (const key of Object.keys(map)) {
    const normalized = normalizeCountryId(key);
    if (normalized !== key) changed = true;
    next[normalized] = map[key] as T;
  }
  return changed ? next : map;
};
