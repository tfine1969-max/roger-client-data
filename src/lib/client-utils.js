const TITLES = /^(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\.?\s+/i;
const TRAILING_TITLES = /\s+(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\.?$/i;
const ENTITY_MARKERS = /\b(pty|ltd|limited|cc|trust|inc|plc|holdings|investments|properties|trading|manufacturers|company|corporation|corp|fund|fof|management|consulting|services|solutions|enterprises|group|associates|capital|advisory|logistics|transport|construction|technologies|technology|media|imaging|images|systems|engineering|healthcare|clinic|pharmacy|pharmacy|retail|distributors|distribution)\b/i;
const ENTITY_PREFIX = /^(ltd|limited|cc|inc|plc),?\s+/i;

function titleCaseWord(word) {
  if (!word) return word;
  if (/^[A-Z]{2,}$/.test(word) && word.length <= 4) return word;
  return word
    .toLowerCase()
    .split(/([-'()])/)
    .map(part => /^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join('');
}

function titleCaseName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(titleCaseWord)
    .join(' ');
}

function normaliseLegalEntity(value) {
  let cleaned = String(value || '').trim().replace(/\s+/g, ' ');
  const prefix = cleaned.match(ENTITY_PREFIX)?.[1];
  if (prefix) {
    cleaned = cleaned.replace(ENTITY_PREFIX, '').trim();
    cleaned = `${cleaned} ${prefix}`;
  }
  // Only fully uppercase if it contains formal legal suffixes (PTY, LTD, CC, etc.)
  const FORMAL_SUFFIX = /\b(pty|ltd|limited|cc|inc|plc|corp|corporation)\b/i;
  if (FORMAL_SUFFIX.test(cleaned)) {
    return cleaned
      .replace(/\(\s*pty\s*\)/ig, '(PTY)')
      .replace(/\bpty\b/ig, 'PTY')
      .replace(/\bltd\b/ig, 'LTD')
      .replace(/\blimited\b/ig, 'LIMITED')
      .replace(/\bcc\b/ig, 'CC')
      .toUpperCase();
  }
  // Otherwise just title-case it, preserving word order
  return titleCaseName(cleaned);
}

export function splitClientName(name) {
  const raw = String(name || '').trim();
  if (!raw) return { surname: '', firstNames: '' };

  // If already in "Surname, Firstnames" format, split on the comma
  if (raw.includes(',')) {
    const [surname, ...rest] = raw.split(',');
    return {
      surname: surname.trim(),
      firstNames: rest.join(',').trim(),
    };
  }

  // No comma — treat the whole name as the entity/surname field (no reordering)
  return { surname: raw, firstNames: '' };
}

export function buildStructuredClientName(surname, firstNames = '') {
  const cleanSurname = String(surname || '').trim();
  const cleanFirstNames = String(firstNames || '').trim();
  if (!cleanSurname) return '';
  if (!cleanFirstNames) {
    // No first names — treat as entity/single name, preserve as-is with title case (no reordering)
    return ENTITY_MARKERS.test(cleanSurname) || ENTITY_PREFIX.test(cleanSurname)
      ? normaliseLegalEntity(cleanSurname)
      : titleCaseName(cleanSurname);
  }
  return `${titleCaseName(cleanSurname)}, ${titleCaseName(cleanFirstNames)}`;
}

export function formatClientName(name) {
  if (!name) return name;
  let cleaned = name.trim();

  if (ENTITY_MARKERS.test(cleaned) || ENTITY_PREFIX.test(cleaned)) {
    return normaliseLegalEntity(cleaned);
  }

  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(TITLES, '').trim();
  } while (cleaned !== prev);
  cleaned = cleaned.replace(TRAILING_TITLES, '').trim();

  if (!cleaned) return name;

  // If it's a comma-formatted name, split and return as-is
  if (cleaned.includes(',')) {
    const [surname, ...rest] = cleaned.split(',');
    return [titleCaseName(surname), titleCaseName(rest.join(' ').trim())].filter(Boolean).join(', ');
  }

  // If it looks like a legal entity (no comma), preserve word order — don't reorder
  if (ENTITY_MARKERS.test(cleaned)) {
    return titleCaseName(cleaned);
  }

  const words = cleaned.split(/\s+/);
  if (words.length < 2) return titleCaseName(cleaned);

  const surname = words[words.length - 1];
  const firstNames = words.slice(0, -1).join(' ');
  return `${titleCaseName(surname)}, ${titleCaseName(firstNames)}`;
}

export function normalizeClientText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|master|dr|prof|rev|adv|hon|sir|lady|lord)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function sortedNameKey(value) {
  return normalizeClientText(value)
    .split(' ')
    .filter(Boolean)
    .sort()
    .join('');
}

export function clientKey(row) {
  const formattedName = formatClientName(row?.portfolio_name || '');
  const name = normalizeClientText(formattedName).replace(/[^a-z0-9]+/g, '');
  const sortedName = sortedNameKey(formattedName);
  if (sortedName && !sortedName.includes('unknown')) return `name-${sortedName}`;
  if (name && !name.includes('unknown')) return `name-${name}`;
  const identity = String(row?.identity_no || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  if (identity) return `id-${identity}`;
  return name ? `name-${name}` : `account-${row?.account_code || 'unknown'}`;
}

export function clientDisplayName(rows = []) {
  const name = rows.find(row => row.portfolio_name)?.portfolio_name;
  return name ? formatClientName(name) : 'Unknown Client';
}

export function hasUnknownValue(value) {
  return String(value ?? '').toLowerCase().includes('unknown');
}

export function rowHasUnknown(row) {
  return [
    row?.account_code,
    row?.identity_no,
    row?.portfolio_name,
    row?.platform,
    row?.investment_name,
    row?.currency,
  ].some(hasUnknownValue);
}
