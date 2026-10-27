import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { inspectDatabaseConfiguration } from '../../utils/db-config.js';
import { createAuthMiddleware } from '../../middleware/auth.middleware.js';

export function createHealthRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  // Public minimal liveness check — does not expose internal DB topology, backup history, or sensitive metadata
  router.get('/', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'HEALTHY',
        schoolName: 'SWAMI VIVEKANAND SIKSHAN SANSTHAN',
        timestamp: new Date().toISOString(),
      });
    } catch (_err: any) {
      res.status(503).json({
        status: 'DEGRADED',
        message: 'Database service is currently unavailable.',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Protected Admin-only database & backup diagnostics
  router.get('/diagnostics', requireAuth, requirePermission('SETTINGS_MANAGE'), async (_req, res) => {
    const start = Date.now();
    const dbConfig = inspectDatabaseConfiguration(process.env);
    try {
      await prisma.$queryRaw`SELECT 1`;
      const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });
      const lastBackup = await prisma.backupLog.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { completedAt: 'desc' },
      });

      res.json({
        status: 'HEALTHY',
        schoolName: settings?.schoolName ?? 'SWAMI VIVEKANAND SIKSHAN SANSTHAN',
        database:
          dbConfig.providerMode === 'NEON_HOSTED'
            ? 'CONNECTED_NEON_POSTGRESQL'
            : 'CONNECTED_LOCAL_POSTGRESQL',
        providerMode: dbConfig.providerMode,
        usesConnectionPooler: dbConfig.usesConnectionPooler,
        hasDirectUrl: dbConfig.hasDirectUrl,
        latencyMs: Date.now() - start,
        initialSetupCompleted: settings?.initialSetupCompleted ?? false,
        lastSuccessfulBackupAt: lastBackup?.completedAt ?? null,
        timestamp: new Date().toISOString(),
      });
    } catch (_err: any) {
      res.status(503).json({
        status: 'DEGRADED',
        database: 'UNAVAILABLE',
        providerMode: dbConfig.providerMode,
        message:
          'डेटाबेस से संपर्क नहीं हो पा रहा है। कृपया नेटवर्क या PostgreSQL सेवा की जाँच करें।',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
