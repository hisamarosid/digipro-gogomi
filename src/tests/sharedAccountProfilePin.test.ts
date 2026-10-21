import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SharedAccountService } from '@/services/sharedAccount.service';
import { InventoryReconciliationService } from '@/services/reconciliation.service';
import { db } from '@/lib/db/prisma';
import { encryptPayload, decryptPayload } from '@/lib/security/encryption';
import { SharedSlotStatus, SharedAccountStatus } from '../../generated/prisma';

describe('Shared Account Profile & PIN - Manual Admin Configuration', () => {
  const dummyVariantNetflix = {
    id: 'var-nflx-1',
    name: 'Netflix 1 Profile + PIN',
    sku: 'NFLX-SHAR-1M',
    sharedCapacityDefault: 5,
    usesProfile: true,
    usesProfilePin: true,
    sharedExposeMasterCredentialToCustomer: true,
    sharedExposeSlotPin: true,
  };

  const dummyVariantAdobe = {
    id: 'var-adb-1',
    name: 'Adobe Shared',
    sku: 'ADB-SHAR-1M',
    sharedCapacityDefault: 2,
    usesProfile: false,
    usesProfilePin: false,
    sharedExposeMasterCredentialToCustomer: true,
    sharedExposeSlotPin: false,
  };

  it('1. Should validate and save manual profile names and encrypted PINs for Netflix', async () => {
    // Test payload formatting & PIN encryption directly
    const rawPin = '9876';
    const encryptedPin = JSON.stringify(encryptPayload(rawPin));
    const decryptedPin = decryptPayload(JSON.parse(encryptedPin));
    expect(decryptedPin).toBe(rawPin);

    // Verify sanitized payload formatting
    const sharedAccount = {
      credentialEncrypted: JSON.stringify(encryptPayload('nflx@example.com:secret123')),
    };
    const slot = {
      slotNumber: 1,
      slotLabel: 'Profile Ayah',
      pinEncrypted: encryptedPin,
    };

    const payload = SharedAccountService.getSanitizedCustomerPayload(
      sharedAccount,
      slot,
      dummyVariantNetflix
    );

    expect(payload).toContain('Account: nflx@example.com:secret123');
    expect(payload).toContain('Profile: Profile Ayah');
    expect(payload).toContain('PIN: 9876');
  });

  it('2. Should omit Profile & PIN when variant has usesProfile=false and usesProfilePin=false (e.g. Adobe)', async () => {
    const sharedAccount = {
      credentialEncrypted: JSON.stringify(encryptPayload('adobe@example.com:secret123')),
    };
    const slot = {
      slotNumber: 1,
      slotLabel: 'Slot 1',
      pinEncrypted: null,
    };

    const payload = SharedAccountService.getSanitizedCustomerPayload(
      sharedAccount,
      slot,
      dummyVariantAdobe
    );

    expect(payload).toBe('Account: adobe@example.com:secret123');
    expect(payload).not.toContain('Profile:');
    expect(payload).not.toContain('PIN:');
  });

  it('3. Should not allow auto-generated profile/PIN in sanitized customer display', () => {
    const slotCustom = {
      slotNumber: 2,
      slotLabel: 'Kakak Gaming',
      pinEncrypted: JSON.stringify(encryptPayload('1122')),
    };
    const payload = SharedAccountService.getSanitizedCustomerPayload(
      { credentialEncrypted: JSON.stringify(encryptPayload('master@test.com:pass')) },
      slotCustom,
      dummyVariantNetflix
    );

    expect(payload).toContain('Profile: Kakak Gaming');
    expect(payload).toContain('PIN: 1122');
    expect(payload).not.toContain('USER 2');
  });

  it('4. Should block capacity reduction if active assigned slots exist in cut range', async () => {
    const mockTx = {
      sharedAccount: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'acc-1',
          maxSlots: 5,
          variant: dummyVariantNetflix,
          slots: [
            { slotNumber: 1, status: 'ASSIGNED' },
            { slotNumber: 2, status: 'ASSIGNED' },
            { slotNumber: 3, status: 'AVAILABLE' },
            { slotNumber: 4, status: 'AVAILABLE' },
            { slotNumber: 5, status: 'ASSIGNED' }, // Slot 5 is currently assigned!
          ],
        }),
      },
    };

    vi.spyOn(db.sharedAccount, 'findUnique').mockImplementation(mockTx.sharedAccount.findUnique);

    await expect(
      SharedAccountService.updateCapacity('acc-1', 4, 'admin-user-1')
    ).rejects.toThrow('Capacity tidak dapat dikurangi');
  });
});
