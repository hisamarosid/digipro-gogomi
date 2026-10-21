import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '@/lib/db/prisma';
import { Role } from '@/../generated/prisma';
import { PermissionService } from '@/services/permission.service';
import { PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS, ALL_PERMISSIONS } from '@/lib/auth/permissions';
import bcrypt from 'bcryptjs';

describe('Admin & Super Admin RBAC / Permission System', () => {
  let superAdminUser: any;
  let regularAdminUser: any;
  let customerUser: any;

  beforeEach(async () => {
    // Create test fixtures with unique emails
    const timestamp = Date.now();
    const passHash = await bcrypt.hash('TestPassword123!', 8);

    superAdminUser = await db.user.create({
      data: {
        name: 'Test Super Admin',
        email: `superadmin_rbac_${timestamp}@test.com`,
        passwordHash: passHash,
        role: Role.SUPER_ADMIN,
      },
    });

    regularAdminUser = await db.user.create({
      data: {
        name: 'Test Regular Admin',
        email: `admin_rbac_${timestamp}@test.com`,
        passwordHash: passHash,
        role: Role.ADMIN,
      },
    });

    customerUser = await db.user.create({
      data: {
        name: 'Test Customer',
        email: `customer_rbac_${timestamp}@test.com`,
        passwordHash: passHash,
        role: Role.CUSTOMER,
      },
    });
  });

  afterAll(async () => {
    // Clean up created test users and related records
    const testUsers = await db.user.findMany({
      where: { email: { contains: '_rbac_' } },
      select: { id: true },
    });
    const ids = testUsers.map((u) => u.id);
    if (ids.length > 0) {
      await db.userPermission.deleteMany({ where: { userId: { in: ids } } });
      await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it('SUPER_ADMIN should automatically have all permissions including sensitive ones', async () => {
    const hasProductView = await PermissionService.hasPermission(superAdminUser.id, PERMISSIONS.PRODUCT_VIEW);
    const hasSensitiveInventory = await PermissionService.hasPermission(superAdminUser.id, PERMISSIONS.INVENTORY_VIEW_SENSITIVE);
    const hasRoleManage = await PermissionService.hasPermission(superAdminUser.id, PERMISSIONS.ROLE_MANAGE);
    const hasPaymentSettings = await PermissionService.hasPermission(superAdminUser.id, PERMISSIONS.PAYMENT_SETTINGS_MANAGE);

    expect(hasProductView).toBe(true);
    expect(hasSensitiveInventory).toBe(true);
    expect(hasRoleManage).toBe(true);
    expect(hasPaymentSettings).toBe(true);

    const userPerms = await PermissionService.getUserPermissions(superAdminUser.id);
    expect(userPerms.effectivePermissions.length).toBe(ALL_PERMISSIONS.length);
  });

  it('ADMIN should have default operational permissions but NOT sensitive permissions by default', async () => {
    // Operational Permissions (Allowed)
    const hasProductView = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.PRODUCT_VIEW);
    const hasOrderUpdate = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.ORDER_UPDATE);
    const hasInventoryView = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.INVENTORY_VIEW);
    const hasSupportReply = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.SUPPORT_REPLY);

    expect(hasProductView).toBe(true);
    expect(hasOrderUpdate).toBe(true);
    expect(hasInventoryView).toBe(true);
    expect(hasSupportReply).toBe(true);

    // Sensitive Permissions (Denied by default)
    const hasSensitiveInventory = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.INVENTORY_VIEW_SENSITIVE);
    const hasPaymentManual = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.PAYMENT_MANUAL_ACTION);
    const hasRoleManage = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.ROLE_MANAGE);
    const hasFeatureFlags = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.FEATURE_FLAGS_MANAGE);
    const hasAdminCreate = await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.ADMIN_CREATE);

    expect(hasSensitiveInventory).toBe(false);
    expect(hasPaymentManual).toBe(false);
    expect(hasRoleManage).toBe(false);
    expect(hasFeatureFlags).toBe(false);
    expect(hasAdminCreate).toBe(false);
  });

  it('ADMIN should gain access to sensitive permissions when explicitly granted by Super Admin', async () => {
    // Initially false
    expect(await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.INVENTORY_VIEW_SENSITIVE)).toBe(false);
    expect(await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.PAYMENT_MANUAL_ACTION)).toBe(false);

    // Super Admin explicitly grants permissions
    await PermissionService.setAdminPermissions(
      regularAdminUser.id,
      [PERMISSIONS.INVENTORY_VIEW_SENSITIVE, PERMISSIONS.PAYMENT_MANUAL_ACTION],
      superAdminUser.id
    );

    // Now true
    expect(await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.INVENTORY_VIEW_SENSITIVE)).toBe(true);
    expect(await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.PAYMENT_MANUAL_ACTION)).toBe(true);

    // Still false for ungranted sensitive permissions
    expect(await PermissionService.hasPermission(regularAdminUser.id, PERMISSIONS.ROLE_MANAGE)).toBe(false);

    // Audit log should be recorded for permission change
    const auditLogs = await db.auditLog.findMany({
      where: {
        actorId: superAdminUser.id,
        action: 'PERMISSION_CHANGED',
        entityId: regularAdminUser.id,
      },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  it('CUSTOMER role should have zero admin permissions', async () => {
    const hasProductView = await PermissionService.hasPermission(customerUser.id, PERMISSIONS.PRODUCT_VIEW);
    const hasOrderView = await PermissionService.hasPermission(customerUser.id, PERMISSIONS.ORDER_VIEW);
    const hasAdminView = await PermissionService.hasPermission(customerUser.id, PERMISSIONS.ADMIN_VIEW);

    expect(hasProductView).toBe(false);
    expect(hasOrderView).toBe(false);
    expect(hasAdminView).toBe(false);
  });

  it('should block non-super admins from modifying permissions or creating admin accounts', async () => {
    // Regular admin tries to grant permissions -> Should throw Error
    await expect(
      PermissionService.setAdminPermissions(
        customerUser.id,
        [PERMISSIONS.PRODUCT_VIEW],
        regularAdminUser.id // actor is regular admin
      )
    ).rejects.toThrow('Hanya Super Admin');

    // Regular admin tries to create admin -> Should throw Error
    await expect(
      PermissionService.createAdmin(
        {
          name: 'Hacker Admin',
          email: `hacker_${Date.now()}@test.com`,
          password: 'Password123!',
          role: Role.SUPER_ADMIN,
        },
        regularAdminUser.id // actor is regular admin
      )
    ).rejects.toThrow('Hanya Super Admin');
  });

  it('Super Admin Protection: should block disabling the last active Super Admin', async () => {
    // If we only have 1 active Super Admin in the system, disabling it should fail
    // First, check how many super admins exist
    const activeSuperAdmins = await db.user.findMany({
      where: { role: Role.SUPER_ADMIN, disabled: false },
    });

    // Disable all other super admins except one for testing
    const [soleSuperAdmin, ...others] = activeSuperAdmins;
    for (const other of others) {
      await db.user.update({ where: { id: other.id }, data: { disabled: true } });
    }

    // Now attempt to disable the sole remaining Super Admin
    await expect(
      PermissionService.updateAdmin(
        soleSuperAdmin.id,
        { disabled: true },
        soleSuperAdmin.id
      )
    ).rejects.toThrow('Sistem harus memiliki setidaknya satu Super Admin aktif');

    // Restore any disabled super admins
    for (const other of others) {
      await db.user.update({ where: { id: other.id }, data: { disabled: false } });
    }
  });

  it('hasAnyPermission and hasAllPermissions helpers work accurately', async () => {
    // Regular admin has product:view (default) but not inventory:view-sensitive
    const hasAny = await PermissionService.hasAnyPermission(regularAdminUser.id, [
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.INVENTORY_VIEW_SENSITIVE,
    ]);
    expect(hasAny).toBe(true);

    const hasAll = await PermissionService.hasAllPermissions(regularAdminUser.id, [
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.INVENTORY_VIEW_SENSITIVE,
    ]);
    expect(hasAll).toBe(false);

    const hasAllOperational = await PermissionService.hasAllPermissions(regularAdminUser.id, [
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.ORDER_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
    ]);
    expect(hasAllOperational).toBe(true);
  });
});
