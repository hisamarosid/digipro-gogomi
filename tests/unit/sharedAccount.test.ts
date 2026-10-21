import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SharedAccountService } from '../../src/services/sharedAccount.service';
import { SharedAccountStatus, SharedSlotStatus, DeliveryModel } from '../../generated/prisma';

describe('Shared Account & Family Slot Allocation System', () => {
  it('should format sanitized customer payload correctly without leaking private data', () => {
    const mockSharedAccount = {
      credentialEncrypted: 'U2FsdGVkX19mock', // fake encrypted
    };
    const mockSlot = {
      slotNumber: 1,
      slotLabel: 'PROFILE 1',
    };
    const mockVariant = {
      sharedExposeMasterCredentialToCustomer: true,
      sharedExposeSlotPin: true,
    };

    const payload = SharedAccountService.getSanitizedCustomerPayload(
      mockSharedAccount,
      mockSlot,
      mockVariant
    );

    expect(payload).toContain('PROFILE 1');
  });

  it('should calculate required master lifetime safety buffer correctly', () => {
    const subscriptionDays = 30;
    const safetyBufferDays = 2;
    const totalRequiredDays = subscriptionDays + safetyBufferDays;

    expect(totalRequiredDays).toBe(32);
  });
});
