import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createAuthMiddleware } from '../../middleware/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';

export function createSettingsRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  router.get('/', requireAuth, async (_req, res, next) => {
    try {
      const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });
      res.json({ settings });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/', requireAuth, requirePermission('SETTINGS_MANAGE'), async (req, res, next) => {
    try {
      const schema = z.object({
        schoolName: z.string().min(5).max(150).optional(),
        schoolSubtitle: z.string().max(200).optional(),
        addressLine1: z.string().min(3).max(200).optional(),
        addressLine2: z.string().max(200).optional(),
        primaryPhone: z.string().min(6).max(30).optional(),
        secondaryPhone: z.string().max(30).optional(),
        email: z.string().email().optional(),
        receiptPrefix: z.string().min(2).max(10).toUpperCase().optional(),
        receiptFooterNote: z.string().max(400).optional(),
        autoAllocateOldestFirst: z.boolean().optional(),
        requireDualControlReversal: z.boolean().optional(),
        logoPath: z.string().max(500000).optional(),
      });
      const parsed = schema.parse(req.body);

      const updated = await prisma.$transaction(async (tx) => {
        const s = await tx.schoolSettings.update({
          where: { id: 1 },
          data: { ...parsed, updatedById: req.staff!.id },
        });
        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'SCHOOL_SETTINGS_UPDATED',
          entityType: 'SETTINGS',
          entityId: '1',
          summary: `Updated school settings (Prefix: ${s.receiptPrefix})`,
          ipAddress: req.ip,
        });
        return s;
      });

      res.json({ settings: updated });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/settings/backups — List recorded database backups (Problem 7 & 10)
  router.get('/backups', requireAuth, requirePermission('BACKUP_MANAGE'), async (_req, res, next) => {
    try {
      const backups = await prisma.backupLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 30,
      });
      const keyConfigured =
        typeof process.env.BACKUP_ENCRYPTION_KEY_HEX === 'string' &&
        /^[0-9a-fA-F]{64}$/.test(process.env.BACKUP_ENCRYPTION_KEY_HEX);

      res.json({
        encryptionConfigured: keyConfigured,
        backups: backups.map((b) => ({
          ...b,
          sizeBytes: b.sizeBytes.toString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
