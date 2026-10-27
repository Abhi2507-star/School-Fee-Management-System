import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, RoleCode } from '@prisma/client';
import { hashPassword, verifyPassword, sanitizeForAuditAndResponse } from '../../security/password.js';
import { generateSessionPair } from '../../security/session-csrf.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { createAuthMiddleware, resolveApplicationRole } from '../../middleware/auth.middleware.js';

const setupAdminSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  fullName: z.string().min(3).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(10),
  schoolAddressLine1: z.string().min(5).optional(),
  primaryPhone: z.string().min(8).optional(),
  receiptPrefix: z.string().min(2).max(10).optional(),
});

const loginSchema = z
  .object({
    username: z.string().trim().optional(),
    email: z.string().trim().optional(),
    identifier: z.string().trim().optional(),
    password: z.string().min(1),
  })
  .refine((data) => Boolean(data.username || data.email || data.identifier), {
    message: 'Username or email is required.',
    path: ['username'],
  });

const createStaffSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  fullName: z.string().min(3).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(10),
  roleCode: z.enum(['ADMINISTRATOR', 'CASHIER', 'ADMIN', 'FEE_COLLECTOR']),
});

const updateDisplayNameSchema = z.object({
  fullName: z.string().trim().min(2, 'Display name must be at least 2 characters.').max(100),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(10),
});

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router();
  const { requireAuth, requirePermission } = createAuthMiddleware(prisma);

  // GET /api/v1/auth/setup-status — Check whether initial administrator setup is required
  router.get('/setup-status', async (_req, res, next) => {
    try {
      const existingUsers = await prisma.user.count();
      const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });
      res.json({
        initialSetupRequired: existingUsers === 0,
        initialSetupCompleted: existingUsers > 0 && Boolean(settings?.initialSetupCompleted ?? true),
        schoolName: settings?.schoolName ?? 'SWAMI VIVEKANAND SIKSHAN SANSTHAN',
      });
    } catch (err) {
      next(err);
    }
  });

  // Initial First-Run Administrator Setup (Rejects if an administrator already exists)
  router.post('/setup-initial-admin', async (req, res, next) => {
    try {
      const existingUsers = await prisma.user.count();
      if (existingUsers > 0) {
        res.status(409).json({
          error: 'SETUP_ALREADY_COMPLETED',
          message: 'Initial administrator setup has already been completed on this school server.',
        });
        return;
      }

      const parsed = setupAdminSchema.parse(req.body);
      const passwordHash = await hashPassword(parsed.password);

      const adminRole = await prisma.role.findUniqueOrThrow({
        where: { code: RoleCode.ADMINISTRATOR },
      });

      const createdUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: parsed.username,
            fullName: parsed.fullName,
            email: parsed.email,
            phone: parsed.phone,
            passwordHash,
            isActive: true,
            userRoles: {
              create: [{ roleId: adminRole.id }],
            },
          },
        });

        await tx.schoolSettings.upsert({
          where: { id: 1 },
          update: {
            initialSetupCompleted: true,
            addressLine1: parsed.schoolAddressLine1,
            primaryPhone: parsed.primaryPhone,
            receiptPrefix: parsed.receiptPrefix ?? 'SVSS',
            updatedById: user.id,
          },
          create: {
            id: 1,
            schoolName: 'SWAMI VIVEKANAND SIKSHAN SANSTHAN',
            initialSetupCompleted: true,
            receiptPrefix: parsed.receiptPrefix ?? 'SVSS',
            updatedById: user.id,
          },
        });

        await recordAuditLog(tx, {
          actorUserId: user.id,
          actorUsername: user.username,
          actorRole: 'ADMINISTRATOR',
          action: 'INITIAL_ADMIN_SETUP',
          entityType: 'USER',
          entityId: user.id,
          summary: `Initial school administrator account (${user.username}) created during first-run setup.`,
          ipAddress: req.ip,
        });

        return user;
      });

      res.status(201).json({
        message: 'Initial administrator account configured.',
        user: sanitizeForAuditAndResponse(createdUser),
      });
    } catch (err) {
      next(err);
    }
  });

  // Staff Login (Supports Username or Email + Password, with Throttling & Lockout)
  router.post('/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.parse(req.body);
      const identifier = (parsed.username || parsed.identifier || parsed.email || '').trim();
      const password = parsed.password;
      const maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
      const lockoutMinutes = Number(process.env.LOGIN_LOCKOUT_MINUTES || 15);

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: identifier, mode: 'insensitive' } },
            { email: { equals: identifier, mode: 'insensitive' } },
          ],
        },
        include: { userRoles: { include: { role: true } } },
      });

      if (!user) {
        await recordAuditLog(prisma, {
          actorUsername: identifier,
          actorRole: 'UNAUTHENTICATED',
          action: 'LOGIN_FAILED_UNKNOWN_USER',
          entityType: 'AUTH',
          entityId: identifier,
          summary: `Failed login attempt for unknown username/email "${identifier}"`,
          ipAddress: req.ip,
        });
        res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username/email or password.' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({
          error: 'ACCOUNT_DEACTIVATED',
          message: 'Your staff account is inactive. Please contact the school administrator.',
        });
        return;
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        res.status(423).json({
          error: 'ACCOUNT_LOCKED',
          message: `Account temporarily locked due to repeated failed sign-in attempts. Try again after ${user.lockedUntil.toISOString()}.`,
        });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        const newAttempts = user.failedLoginAttempts + 1;
        const lockUntil =
          newAttempts >= maxAttempts
            ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
            : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockedUntil: lockUntil,
          },
        });

        await recordAuditLog(prisma, {
          actorUserId: user.id,
          actorUsername: user.username,
          actorRole: user.userRoles.map((r) => r.role.code).join(','),
          action: lockUntil ? 'ACCOUNT_LOCKED_FAILED_LOGINS' : 'LOGIN_FAILED_BAD_PASSWORD',
          entityType: 'USER',
          entityId: user.id,
          summary: `Failed login attempt (${newAttempts}/${maxAttempts}) for staff user ${user.username}`,
          ipAddress: req.ip,
        });

        res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username/email or password.' });
        return;
      }

      // Reset lockout counters and create server-side session
      const ttlMinutes = Number(process.env.SESSION_TTL_MINUTES || 480);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      const { rawSessionToken, tokenHash, csrfToken } = generateSessionPair();

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        }),
        prisma.userSession.create({
          data: {
            userId: user.id,
            tokenHash,
            csrfToken,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] ?? null,
            expiresAt,
          },
        }),
      ]);

      const roles = user.userRoles.map((ur) => ur.role.code);
      const appRole = resolveApplicationRole(roles);

      await recordAuditLog(prisma, {
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: roles.join(','),
        action: 'LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: user.id,
        summary: `Staff member ${user.fullName} (${user.username}) signed in as ${appRole}.`,
        ipAddress: req.ip,
      });

      res.cookie('svss_session', rawSessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        expires: expiresAt,
        path: '/',
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          roles,
          appRole,
        },
        redirectTo: '/',
        dashboardType: appRole === 'ADMIN' ? 'ADMIN_DASHBOARD' : 'FEE_COLLECTOR_DASHBOARD',
        csrfToken,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', requireAuth, async (req, res, next) => {
    try {
      await prisma.userSession.update({
        where: { id: req.staff!.sessionId },
        data: { revokedAt: new Date() },
      });

      await recordAuditLog(prisma, {
        actorUserId: req.staff!.id,
        actorUsername: req.staff!.username,
        actorRole: req.staff!.roles.join(','),
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: req.staff!.id,
        summary: `Staff member ${req.staff!.username} signed out.`,
        ipAddress: req.ip,
      });

      res.clearCookie('svss_session', { path: '/' });
      res.json({ message: 'Signed out.', redirectTo: '/login' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', requireAuth, async (req, res) => {
    res.json({
      user: {
        id: req.staff!.id,
        username: req.staff!.username,
        fullName: req.staff!.fullName,
        roles: req.staff!.roles,
        appRole: req.staff!.appRole,
        permissions: Array.from(req.staff!.permissions),
      },
      csrfToken: req.staff!.csrfToken,
    });
  });

  // PATCH /api/v1/auth/me/display-name — Allow authenticated user to update their own display name
  // without altering login credentials or historical transaction records
  router.patch('/me/display-name', requireAuth, async (req, res, next) => {
    try {
      const { fullName } = updateDisplayNameSchema.parse(req.body);
      const updated = await prisma.$transaction(async (tx) => {
        const before = await tx.user.findUniqueOrThrow({ where: { id: req.staff!.id } });
        const user = await tx.user.update({
          where: { id: req.staff!.id },
          data: { fullName },
        });
        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'STAFF_DISPLAY_NAME_UPDATED',
          entityType: 'USER',
          entityId: user.id,
          summary: `Updated display name for account ${user.username} from "${before.fullName}" to "${user.fullName}" (credentials & historical receipts preserved).`,
          ipAddress: req.ip,
        });
        return user;
      });

      res.json({
        message: 'Display name updated without changing login credentials or historical records.',
        user: sanitizeForAuditAndResponse(updated),
      });
    } catch (err) {
      next(err);
    }
  });

  // Administrator Staff Management Endpoints
  router.get('/staff', requireAuth, requirePermission('STAFF_MANAGE'), async (_req, res, next) => {
    try {
      const staffList = await prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        include: { userRoles: { include: { role: true } } },
      });
      res.json({
        staff: staffList.map((u) =>
          sanitizeForAuditAndResponse({
            ...u,
            roles: u.userRoles.map((ur) => ur.role.code),
          })
        ),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/staff', requireAuth, requirePermission('STAFF_MANAGE'), async (req, res, next) => {
    try {
      const parsed = createStaffSchema.parse(req.body);
      const passwordHash = await hashPassword(parsed.password);
      const normalizedRoleCode: RoleCode =
        parsed.roleCode === 'ADMIN' || parsed.roleCode === 'ADMINISTRATOR'
          ? RoleCode.ADMINISTRATOR
          : RoleCode.CASHIER;
      const role = await prisma.role.findUniqueOrThrow({ where: { code: normalizedRoleCode } });

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: parsed.username,
            fullName: parsed.fullName,
            email: parsed.email,
            phone: parsed.phone,
            passwordHash,
            isActive: true,
            createdById: req.staff!.id,
            userRoles: { create: [{ roleId: role.id, assignedBy: req.staff!.id }] },
          },
        });

        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'STAFF_ACCOUNT_CREATED',
          entityType: 'USER',
          entityId: user.id,
          summary: `Created staff account ${user.username} (${user.fullName}) with role ${parsed.roleCode}`,
          ipAddress: req.ip,
        });

        return user;
      });

      res.status(201).json({ staff: sanitizeForAuditAndResponse(created) });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/v1/auth/staff/:id/display-name — Admin updates staff display name without changing login credentials or historical receipts
  router.patch('/staff/:id/display-name', requireAuth, requirePermission('STAFF_MANAGE'), async (req, res, next) => {
    try {
      const { fullName } = updateDisplayNameSchema.parse(req.body);
      const staffId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await prisma.$transaction(async (tx) => {
        const before = await tx.user.findUniqueOrThrow({ where: { id: staffId } });
        const user = await tx.user.update({
          where: { id: staffId },
          data: { fullName },
        });
        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'STAFF_DISPLAY_NAME_UPDATED',
          entityType: 'USER',
          entityId: user.id,
          summary: `Admin (${req.staff!.username}) updated display name for ${user.username} from "${before.fullName}" to "${user.fullName}" (credentials & historical transactions preserved).`,
          ipAddress: req.ip,
        });
        return user;
      });

      res.json({
        message: 'Staff display name updated without altering login credentials or historical transaction records.',
        staff: sanitizeForAuditAndResponse(updated),
      });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/staff/:id/status', requireAuth, requirePermission('STAFF_MANAGE'), async (req, res, next) => {
    try {
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      const staffId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (staffId === req.staff!.id && !isActive) {
        res.status(400).json({ error: 'SELF_DEACTIVATION_BLOCKED', message: 'You cannot deactivate your own active administrator account.' });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: staffId },
          data: { isActive },
        });
        if (!isActive) {
          await tx.userSession.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: isActive ? 'STAFF_ACCOUNT_ACTIVATED' : 'STAFF_ACCOUNT_DEACTIVATED',
          entityType: 'USER',
          entityId: user.id,
          summary: `${isActive ? 'Activated' : 'Deactivated'} staff account ${user.username}`,
          ipAddress: req.ip,
        });
        return user;
      });

      res.json({ staff: sanitizeForAuditAndResponse(updated) });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/v1/auth/staff/:id/password — Admin Secure Password Reset for Fee Collector / Staff
  router.patch('/staff/:id/password', requireAuth, requirePermission('STAFF_MANAGE'), async (req, res, next) => {
    try {
      const { newPassword } = resetPasswordSchema.parse(req.body);
      const passwordHash = await hashPassword(newPassword);
      const staffId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: staffId },
          data: {
            passwordHash,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
        // Revoke active sessions so the staff member signs in with the new password
        await tx.userSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await recordAuditLog(tx, {
          actorUserId: req.staff!.id,
          actorUsername: req.staff!.username,
          actorRole: req.staff!.roles.join(','),
          action: 'STAFF_PASSWORD_RESET',
          entityType: 'USER',
          entityId: user.id,
          summary: `Admin (${req.staff!.username}) reset password for staff account ${user.username} (${user.fullName}).`,
          ipAddress: req.ip,
        });
        return user;
      });

      res.json({
        message: 'Password updated and existing sessions revoked.',
        staff: sanitizeForAuditAndResponse(updated),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
