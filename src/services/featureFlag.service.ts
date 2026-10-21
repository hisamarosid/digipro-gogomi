import { db } from '@/lib/db/prisma';
import { cache } from 'react';
import { FeatureKey, FeatureFlagMeta, FEATURE_FLAGS_CONFIG } from '@/config/featureFlags.config';

export type { FeatureKey, FeatureFlagMeta };
export { FEATURE_FLAGS_CONFIG };

export class FeatureFlagService {
  private static SETTING_KEY = 'FEATURE_FLAGS';

  /**
   * Retrieves all feature flag states from DB (falling back to defaults) - cached per request
   */
  static getAllFlags = cache(async (): Promise<Record<FeatureKey, boolean>> => {
    try {
      const setting = await db?.siteSetting?.findUnique?.({
        where: { key: FeatureFlagService.SETTING_KEY },
      });

      let storedFlags: Record<string, boolean> = {};
      if (setting?.value) {
        try {
          storedFlags = JSON.parse(setting.value);
        } catch {
          // Ignore malformed JSON in DB and use default flags
        }
      }

      const flags: Record<FeatureKey, boolean> = {} as Record<FeatureKey, boolean>;

      for (const [key, meta] of Object.entries(FEATURE_FLAGS_CONFIG)) {
        const featKey = key as FeatureKey;
        flags[featKey] = storedFlags[featKey] !== undefined ? storedFlags[featKey] : meta.defaultState;
      }

      return flags;
    } catch {
      // Fallback to default states if DB is offline or table loading
      const flags: Record<FeatureKey, boolean> = {} as Record<FeatureKey, boolean>;
      for (const [key, meta] of Object.entries(FEATURE_FLAGS_CONFIG)) {
        flags[key as FeatureKey] = meta.defaultState;
      }
      return flags;
    }
  });

  /**
   * Evaluates if a specific feature flag is currently enabled (cached per-request)
   */
  static isEnabled = cache(async (featureKey: FeatureKey): Promise<boolean> => {
    const flags = await FeatureFlagService.getAllFlags();
    return flags[featureKey] ?? FEATURE_FLAGS_CONFIG[featureKey]?.defaultState ?? true;
  });

  /**
   * Updates a feature flag state, saves setting in DB, and records AuditLog
   */
  static async updateFlag(
    featureKey: FeatureKey,
    enabled: boolean,
    actorUserId: string
  ): Promise<Record<FeatureKey, boolean>> {
    const currentFlags = await this.getAllFlags();
    const oldValue = currentFlags[featureKey];

    const updatedFlags = {
      ...currentFlags,
      [featureKey]: enabled,
    };

    // Save to SiteSetting DB
    await db.siteSetting.upsert({
      where: { key: this.SETTING_KEY },
      update: { value: JSON.stringify(updatedFlags) },
      create: {
        key: this.SETTING_KEY,
        value: JSON.stringify(updatedFlags),
        category: 'SYSTEM',
      },
    });

    // Record AuditLog entry
    const action = enabled ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED';
    try {
      await db.auditLog.create({
        data: {
          actorId: actorUserId,
          action,
          entity: 'FEATURE_FLAG',
          entityId: featureKey,
          before: JSON.stringify({ feature: featureKey, enabled: oldValue }),
          after: JSON.stringify({ feature: featureKey, enabled }),
        },
      });
    } catch (err) {
      console.error('[FeatureFlagService AuditLog Error]:', err);
    }

    return updatedFlags;
  }
}
