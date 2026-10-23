import { describe, it, expect } from 'vitest';
import { parseCredential } from '@/lib/utils/credential-parser';

describe('parseCredential', () => {
  it('splits email|password', () => {
    expect(parseCredential('user@mail.com|S3cret!')).toEqual([
      { label: 'Email', value: 'user@mail.com', kind: 'email' },
      { label: 'Password', value: 'S3cret!', kind: 'password' },
    ]);
  });

  it('splits "email | password" with spaces', () => {
    const f = parseCredential('user@mail.com | pass word1');
    expect(f.map((x) => x.value)).toEqual(['user@mail.com', 'pass word1']);
  });

  it('splits email:password', () => {
    const f = parseCredential('user@mail.com:abc123');
    expect(f).toEqual([
      { label: 'Email', value: 'user@mail.com', kind: 'email' },
      { label: 'Password', value: 'abc123', kind: 'password' },
    ]);
  });

  it('reads labelled lines', () => {
    const f = parseCredential('Email: user@mail.com\nPassword: abc123\nLink: https://netflix.com/login');
    expect(f.map((x) => [x.kind, x.value])).toEqual([
      ['email', 'user@mail.com'],
      ['password', 'abc123'],
      ['link', 'https://netflix.com/login'],
    ]);
  });

  it('handles shared-account payload with profile and PIN', () => {
    const f = parseCredential('Account: user@mail.com|abc123\nProfile: User 2 | PIN: 4821');
    expect(f.map((x) => [x.label, x.value])).toEqual([
      ['Email', 'user@mail.com'],
      ['Password', 'abc123'],
      ['Profile', 'User 2'],
      ['PIN', '4821'],
    ]);
  });

  it('does not treat https:// as a label', () => {
    expect(parseCredential('https://example.com/login')).toEqual([]);
  });

  it('returns [] for unstructured text so callers show it raw', () => {
    expect(parseCredential('XXXX-YYYY-ZZZZ-1111')).toEqual([]);
    expect(parseCredential('')).toEqual([]);
  });

  it('uses Username when the first part is not an email', () => {
    const f = parseCredential('gogomi_user|pw123');
    expect(f[0]).toEqual({ label: 'Username', value: 'gogomi_user', kind: 'username' });
  });
});
