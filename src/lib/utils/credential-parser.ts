export type CredentialFieldKind = 'email' | 'username' | 'password' | 'pin' | 'link' | 'text';

export interface CredentialField {
  label: string;
  value: string;
  kind: CredentialFieldKind;
}

const LABEL_KINDS: Array<[RegExp, CredentialFieldKind, string]> = [
  [/^(e-?mail|mail|email address)$/i, 'email', 'Email'],
  [/^(user ?name|user|login|id)$/i, 'username', 'Username'],
  [/^(password|pass|pwd|sandi|kata sandi)$/i, 'password', 'Password'],
  [/^(pin|profile pin|pin profil)$/i, 'pin', 'PIN'],
  [/^(link|url|login url|situs)$/i, 'link', 'Link'],
];

const LABELED = /^([A-Za-z][\w \-/]{0,24}?)\s*[:=]\s*(.+)$/;
const EMAIL_COLON_PASSWORD = /^([^\s:|@]+@[^\s:|]+):(\S+)$/;
const URL_ONLY = /^https?:\/\/\S+$/i;

function classifyLabel(rawLabel: string): { kind: CredentialFieldKind; label: string } {
  const label = rawLabel.trim();
  for (const [re, kind, pretty] of LABEL_KINDS) {
    if (re.test(label)) return { kind, label: pretty };
  }
  return { kind: 'text', label };
}

function splitLabeled(segment: string): { label: string; value: string } | null {
  const m = segment.match(LABELED);
  if (!m) return null;
  // "https://example.com" must not be read as label "https".
  if (m[2].startsWith('//')) return null;
  return { label: m[1], value: m[2].trim() };
}

/**
 * Splits free-form credential text such as `email|password`, `email:password`,
 * `Email: a@b.com` / `Password: x` lines, or `Account: a@b.com|pw` + `Profile: User 1 | PIN: 1234`
 * into separate copyable fields. Returns [] when nothing structured is recognised,
 * so callers can fall back to showing the raw text.
 */
export function parseCredential(text: string): CredentialField[] {
  const fields: CredentialField[] = [];
  if (!text) return fields;

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;

    // "Account: email|password" — the prefix only wraps the real credential.
    const accountPrefix = line.match(/^(?:account|akun)\s*:\s*(.+)$/i);
    if (accountPrefix && /[|@]/.test(accountPrefix[1])) line = accountPrefix[1].trim();

    if (URL_ONLY.test(line)) {
      fields.push({ label: 'Link', value: line, kind: 'link' });
      continue;
    }

    const emailColon = line.match(EMAIL_COLON_PASSWORD);
    if (emailColon) {
      fields.push({ label: 'Email', value: emailColon[1], kind: 'email' });
      fields.push({ label: 'Password', value: emailColon[2], kind: 'password' });
      continue;
    }

    const segments = line.split(/\s*\|\s*/).filter((s) => s.length > 0);
    segments.forEach((segment, index) => {
      const labeled = splitLabeled(segment);
      if (labeled) {
        const { kind, label } = classifyLabel(labeled.label);
        fields.push({ label, value: labeled.value, kind });
        return;
      }

      if (segments.length >= 2) {
        // Positional form: first = email/username, second = password, rest = extra info.
        if (index === 0) {
          const isEmail = segment.includes('@');
          fields.push({ label: isEmail ? 'Email' : 'Username', value: segment, kind: isEmail ? 'email' : 'username' });
          return;
        }
        if (index === 1) {
          fields.push({ label: 'Password', value: segment, kind: 'password' });
          return;
        }
      }

      fields.push({ label: 'Info', value: segment, kind: URL_ONLY.test(segment) ? 'link' : 'text' });
    });
  }

  // Only worth splitting when we found something credential-like.
  const structured = fields.some((f) => f.kind === 'email' || f.kind === 'username' || f.kind === 'password' || f.kind === 'pin');
  return structured ? fields : [];
}
