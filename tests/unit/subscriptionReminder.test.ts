import { describe, it, expect } from 'vitest';
import {
  classifyReminderStage,
  buildReminderDedupeKey,
} from '@/services/subscriptionReminder.service';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-24T02:00:00.000Z');
const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

describe('classifyReminderStage', () => {
  it('reminds when 3 days or less remain', () => {
    expect(classifyReminderStage(at(3 * DAY), now)).toBe('EXPIRING');
    expect(classifyReminderStage(at(1 * DAY), now)).toBe('EXPIRING');
    expect(classifyReminderStage(at(60_000), now)).toBe('EXPIRING');
  });

  it('does not remind earlier than 3 days', () => {
    expect(classifyReminderStage(at(3 * DAY + 1000), now)).toBeNull();
    expect(classifyReminderStage(at(20 * DAY), now)).toBeNull();
  });

  it('sends an expired notice right after the end, within the window', () => {
    expect(classifyReminderStage(at(0), now)).toBe('EXPIRED');
    expect(classifyReminderStage(at(-1 * DAY), now)).toBe('EXPIRED');
    expect(classifyReminderStage(at(-3 * DAY), now)).toBe('EXPIRED');
  });

  it('ignores subscriptions that expired long ago', () => {
    expect(classifyReminderStage(at(-3 * DAY - 1000), now)).toBeNull();
    expect(classifyReminderStage(at(-90 * DAY), now)).toBeNull();
  });
});

describe('buildReminderDedupeKey', () => {
  const expiresAt = new Date('2026-10-26T02:00:00.000Z');

  it('is stable for the same subscription, stage and expiry', () => {
    expect(buildReminderDedupeKey('EXPIRING', 'sub1', expiresAt)).toBe(
      buildReminderDedupeKey('EXPIRING', 'sub1', new Date(expiresAt.getTime()))
    );
  });

  it('differs per stage and per expiry date so renewals get new reminders', () => {
    const a = buildReminderDedupeKey('EXPIRING', 'sub1', expiresAt);
    expect(buildReminderDedupeKey('EXPIRED', 'sub1', expiresAt)).not.toBe(a);
    expect(buildReminderDedupeKey('EXPIRING', 'sub1', new Date(expiresAt.getTime() + 30 * DAY))).not.toBe(a);
    expect(buildReminderDedupeKey('EXPIRING', 'sub2', expiresAt)).not.toBe(a);
  });
});
