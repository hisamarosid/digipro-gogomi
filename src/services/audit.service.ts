import { db } from '@/lib/db/prisma';

export class AuditService {
  /**
   * Records sensitive admin operations to the AuditLog database table
   */
  static async log(input: {
    actorId: string;
    action: string;
    entity: string;
    entityId?: string;
    before?: any;
    after?: any;
    ip?: string;
    userAgent?: string;
  }) {
    try {
      return await db.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId || null,
          before: input.before ? JSON.stringify(input.before) : null,
          after: input.after ? JSON.stringify(input.after) : null,
          ip: input.ip || null,
          userAgent: input.userAgent || null,
        },
      });
    } catch (err: any) {
      console.error('[AuditService] Failed to create audit log:', err.message);
    }
  }
}
