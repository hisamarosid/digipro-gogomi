import { db } from '@/lib/db/prisma';
import { Role } from '@/../generated/prisma';
import {
  ALL_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  PERMISSIONS,
  PermissionCode,
  SENSITIVE_PERMISSIONS,
} from '@/lib/auth/permissions';
import { AuditService } from './audit.service';
import bcrypt from 'bcryptjs';

export class PermissionService {
  /**
   * Checks if a given user has the specified permission.
   * - SUPER_ADMIN always has all permissions.
   * - CUSTOMER has 0 admin permissions.
   * - ADMIN has DEFAULT_ADMIN_PERMISSIONS + any explicitly granted UserPermission rows.
   */
  static async hasPermission(userId: string, permission: PermissionCode): Promise<boolean> {
    if (!userId || !permission) return false;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        disabled: true,
        permissions: { select: { permission: true } },
      },
    });

    if (!user || user.disabled) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    if (user.role === Role.CUSTOMER) return false;

    // If explicit custom permissions are assigned, strictly check against them
    if (user.permissions.length > 0) {
      return user.permissions.some((p) => p.permission === permission);
    }

    // Default fallback only if no custom permissions have been configured yet
    return DEFAULT_ADMIN_PERMISSIONS.has(permission);
  }

  /**
   * Checks if the user has ANY of the requested permissions.
   */
  static async hasAnyPermission(userId: string, permissions: PermissionCode[]): Promise<boolean> {
    if (!userId || permissions.length === 0) return false;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        disabled: true,
        permissions: { select: { permission: true } },
      },
    });

    if (!user || user.disabled) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    if (user.role === Role.CUSTOMER) return false;

    if (user.permissions.length > 0) {
      const customSet = new Set(user.permissions.map((p) => p.permission));
      return permissions.some((perm) => customSet.has(perm));
    }

    return permissions.some((perm) => DEFAULT_ADMIN_PERMISSIONS.has(perm));
  }

  /**
   * Checks if the user has ALL of the requested permissions.
   */
  static async hasAllPermissions(userId: string, permissions: PermissionCode[]): Promise<boolean> {
    if (!userId || permissions.length === 0) return false;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        disabled: true,
        permissions: { select: { permission: true } },
      },
    });

    if (!user || user.disabled) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    if (user.role === Role.CUSTOMER) return false;

    if (user.permissions.length > 0) {
      const customSet = new Set(user.permissions.map((p) => p.permission));
      return permissions.every((perm) => customSet.has(perm));
    }

    return permissions.every((perm) => DEFAULT_ADMIN_PERMISSIONS.has(perm));
  }

  /**
   * Retrieves all effective permissions for a user (role defaults or explicit custom grants).
   */
  static async getUserPermissions(userId: string): Promise<{
    userId: string;
    role: Role;
    disabled: boolean;
    effectivePermissions: PermissionCode[];
    customPermissions: PermissionCode[];
  }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        disabled: true,
        permissions: { select: { permission: true } },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === Role.SUPER_ADMIN) {
      return {
        userId: user.id,
        role: user.role,
        disabled: user.disabled,
        effectivePermissions: [...ALL_PERMISSIONS],
        customPermissions: [],
      };
    }

    if (user.role === Role.CUSTOMER) {
      return {
        userId: user.id,
        role: user.role,
        disabled: user.disabled,
        effectivePermissions: [],
        customPermissions: [],
      };
    }

    const custom = user.permissions.map((p) => p.permission as PermissionCode);

    if (custom.length > 0) {
      return {
        userId: user.id,
        role: user.role,
        disabled: user.disabled,
        effectivePermissions: custom,
        customPermissions: custom,
      };
    }

    const defaultPerms = Array.from(DEFAULT_ADMIN_PERMISSIONS);
    return {
      userId: user.id,
      role: user.role,
      disabled: user.disabled,
      effectivePermissions: defaultPerms,
      customPermissions: [],
    };
  }

  /**
   * Sets explicit custom permissions for a target admin user.
   */
  static async setAdminPermissions(
    targetUserId: string,
    permissions: PermissionCode[],
    actorUserId: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const [actor, target] = await Promise.all([
      db.user.findUnique({ where: { id: actorUserId }, select: { id: true, role: true } }),
      db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, role: true, permissions: { select: { permission: true } } },
      }),
    ]);

    if (!actor || actor.role !== Role.SUPER_ADMIN) {
      throw new Error('Hanya Super Admin yang berwenang mengubah izin administrator');
    }

    if (!target) {
      throw new Error('Target administrator tidak ditemukan');
    }

    if (target.role === Role.SUPER_ADMIN) {
      throw new Error('Super Admin otomatis memiliki seluruh izin dan tidak memerlukan custom permissions');
    }

    const previousPerms = target.permissions.map((p) => p.permission);

    // Filter valid permission codes
    const validPerms = Array.from(new Set(permissions.filter((p) => ALL_PERMISSIONS.includes(p))));

    // Run in transaction: remove previous, insert new
    await db.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({
        where: { userId: targetUserId },
      });

      if (validPerms.length > 0) {
        await tx.userPermission.createMany({
          data: validPerms.map((perm) => ({
            userId: targetUserId,
            permission: perm,
            grantedBy: actorUserId,
          })),
        });
      }
    });

    // Record Audit Log (without plain secrets)
    await AuditService.log({
      actorId: actorUserId,
      action: 'PERMISSION_CHANGED',
      entity: 'USER_PERMISSION',
      entityId: targetUserId,
      before: { targetEmail: target.email, permissions: previousPerms },
      after: { targetEmail: target.email, permissions: validPerms },
      ip,
      userAgent,
    });
  }

  /**
   * Lists all administrator accounts with their roles and granted permissions.
   */
  static async listAdmins(filter?: { search?: string; role?: Role; disabled?: boolean }) {
    const where: any = {
      role: { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_STAFF, Role.SUPPORT, Role.EDITOR] },
    };

    if (filter?.role) {
      where.role = filter.role;
    }

    if (typeof filter?.disabled === 'boolean') {
      where.disabled = filter.disabled;
    }

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { email: { contains: filter.search } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
        permissions: { select: { permission: true, grantedAt: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });

    return users.map((u) => {
      const customPermissions = u.permissions.map((p) => p.permission as PermissionCode);
      const isSuper = u.role === Role.SUPER_ADMIN;
      const effectivePermissions = isSuper
        ? ALL_PERMISSIONS
        : customPermissions.length > 0
        ? customPermissions
        : Array.from(DEFAULT_ADMIN_PERMISSIONS);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        disabled: u.disabled,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        customPermissions,
        effectivePermissions,
        isSuperAdmin: isSuper,
      };
    });
  }

  /**
   * Creates a new Administrator account with Super Admin protection checks.
   */
  static async createAdmin(
    input: {
      name: string;
      email: string;
      password: string;
      role: Role;
      customPermissions?: PermissionCode[];
    },
    actorUserId: string,
    ip?: string,
    userAgent?: string
  ) {
    const actor = await db.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, role: true },
    });

    if (!actor || actor.role !== Role.SUPER_ADMIN) {
      throw new Error('Hanya Super Admin yang berwenang membuat akun administrator baru');
    }

    if (input.role === Role.CUSTOMER) {
      throw new Error('Gunakan alur registrasi pelanggan biasa untuk akun customer');
    }

    // Check email uniqueness
    const existing = await db.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new Error(`Email "${input.email}" sudah terdaftar dalam sistem`);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const normalizedEmail = input.email.toLowerCase().trim();

    const created = await db.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: input.role,
        disabled: false,
      },
    });

    // Add initial custom permissions if provided and not Super Admin
    if (input.role !== Role.SUPER_ADMIN && input.customPermissions && input.customPermissions.length > 0) {
      const validPerms = Array.from(new Set(input.customPermissions.filter((p) => ALL_PERMISSIONS.includes(p))));
      if (validPerms.length > 0) {
        await db.userPermission.createMany({
          data: validPerms.map((perm) => ({
            userId: created.id,
            permission: perm,
            grantedBy: actorUserId,
          })),
        });
      }
    }

    // Record Audit Log (NO PLAINTEXT PASSWORDS!)
    await AuditService.log({
      actorId: actorUserId,
      action: 'ADMIN_CREATED',
      entity: 'USER',
      entityId: created.id,
      after: {
        name: created.name,
        email: created.email,
        role: created.role,
        initialCustomPermissions: input.customPermissions || [],
      },
      ip,
      userAgent,
    });

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
    };
  }

  /**
   * Updates an admin's role, name, email, or active status with safety constraints.
   */
  static async updateAdmin(
    targetUserId: string,
    input: {
      name?: string;
      email?: string;
      role?: Role;
      disabled?: boolean;
      password?: string;
    },
    actorUserId: string,
    ip?: string,
    userAgent?: string
  ) {
    const [actor, target] = await Promise.all([
      db.user.findUnique({ where: { id: actorUserId }, select: { id: true, role: true } }),
      db.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true, email: true, role: true, disabled: true } }),
    ]);

    if (!actor || actor.role !== Role.SUPER_ADMIN) {
      throw new Error('Hanya Super Admin yang berwenang mengubah profil atau role administrator');
    }

    if (!target) {
      throw new Error('Target administrator tidak ditemukan');
    }

    // Safeguard: Prevent disabling or demoting the last active Super Admin
    if (target.role === Role.SUPER_ADMIN) {
      const isDemotingOrDisabling =
        (input.role && input.role !== Role.SUPER_ADMIN) || (input.disabled === true && !target.disabled);

      if (isDemotingOrDisabling) {
        const activeSuperAdminCount = await db.user.count({
          where: {
            role: Role.SUPER_ADMIN,
            disabled: false,
          },
        });

        if (activeSuperAdminCount <= 1) {
          throw new Error('Sistem harus memiliki setidaknya satu Super Admin aktif. Tindakan dibatalkan.');
        }
      }
    }

    const updateData: any = {};
    if (input.name) updateData.name = input.name.trim();
    if (input.email) updateData.email = input.email.toLowerCase().trim();
    if (input.role) updateData.role = input.role;
    if (typeof input.disabled === 'boolean') updateData.disabled = input.disabled;
    if (input.password) {
      updateData.passwordHash = await bcrypt.hash(input.password, 12);
    }

    const updated = await db.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    // Check if role changed
    if (input.role && input.role !== target.role) {
      await AuditService.log({
        actorId: actorUserId,
        action: 'ROLE_CHANGED',
        entity: 'USER',
        entityId: targetUserId,
        before: { email: target.email, role: target.role },
        after: { email: updated.email, role: updated.role },
        ip,
        userAgent,
      });
    }

    // Check if disabled status changed
    if (typeof input.disabled === 'boolean' && input.disabled !== target.disabled) {
      await AuditService.log({
        actorId: actorUserId,
        action: input.disabled ? 'ADMIN_DISABLED' : 'ADMIN_ENABLED',
        entity: 'USER',
        entityId: targetUserId,
        before: { email: target.email, disabled: target.disabled },
        after: { email: updated.email, disabled: updated.disabled },
        ip,
        userAgent,
      });
    }

    // General update audit
    await AuditService.log({
      actorId: actorUserId,
      action: 'ADMIN_UPDATED',
      entity: 'USER',
      entityId: targetUserId,
      before: { name: target.name, email: target.email, role: target.role, disabled: target.disabled },
      after: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        disabled: updated.disabled,
        passwordChanged: !!input.password,
      },
      ip,
      userAgent,
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      disabled: updated.disabled,
    };
  }
}
