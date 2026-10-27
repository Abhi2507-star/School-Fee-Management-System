import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createAuthMiddleware } from '../../middleware/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';

export function createAcademicsRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  router.get('/academic-years', requireAuth, requirePermission('STUDENT_VIEW'), async (_req, res, next) => {
    try {
      const years = await prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
      res.json({ academicYears: years });
    } catch (err) {
      next(err);
    }
  });

  router.post('/academic-years', requireAuth, requirePermission('ACADEMIC_MANAGE'), async (req, res, next) => {
    try {
      const schema = z.object({
        code: z.string().regex(/^\d{4}-\d{2}$/),
        name: z.string().min(5).max(80),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        isCurrent: z.boolean().default(false),
      });
      const parsed = schema.parse(req.body);

      const year = await prisma.$transaction(async (tx) => {
        if (parsed.isCurrent) {
          await tx.academicYear.updateMany({ data: { isCurrent: false } });
        }
        const created = await tx.academicYear.create({
          data: {
            code: parsed.code,
            name: parsed.name,
            startDate: new Date(parsed.startDate),
            endDate: new Date(parsed.endDate),
            isCurrent: parsed.isCurrent,
          },
        });
        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'ACADEMIC_YEAR_CREATED',
          entityType: 'ACADEMIC_YEAR',
          entityId: created.id,
          summary: `Created academic session ${created.code} (${created.name})`,
          ipAddress: req.ip,
        });
        return created;
      });

      res.status(201).json({ academicYear: year });
    } catch (err) {
      next(err);
    }
  });

  router.get('/classes', requireAuth, requirePermission('STUDENT_VIEW'), async (_req, res, next) => {
    try {
      const classes = await prisma.schoolClass.findMany({
        orderBy: { displayOrder: 'asc' },
        include: { sections: { orderBy: { name: 'asc' } } },
      });
      res.json({ classes });
    } catch (err) {
      next(err);
    }
  });

  router.post('/classes/:id/sections', requireAuth, requirePermission('ACADEMIC_MANAGE'), async (req, res, next) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(30),
        capacity: z.number().int().min(1).max(120).default(45),
        roomNumber: z.string().optional(),
      });
      const parsed = schema.parse(req.body);
      const classId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const section = await prisma.section.create({
        data: {
          classId,
          name: parsed.name,
          capacity: parsed.capacity,
          roomNumber: parsed.roomNumber,
        },
      });
      res.status(201).json({ section });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
