/**
 * Server-Side Authentication, Session Verification, CSRF & Two-Role RBAC Middleware
 * Enforces strict permissions at the API layer for the two supported roles:
 *   1. Admin (RoleCode.ADMINISTRATOR) — Full access to all school fee management & admin endpoints.
 *   2. Fee Collector (RoleCode.CASHIER) — Strictly limited to student search/ledger view,
 *      fee collection, receipt printing/reprinting, and permitted daily collection reports.
 */
import type { Request, Response, NextFunction } from 'express';
import { PrismaClient, RoleCode } from '@prisma/client';
import { hashSessionToken, verifyCsrfToken } from '../security/session-csrf.js';
import { CANONICAL_PERMISSIONS } from '../../../../prisma/seed.js';

export const TWO_ROLE_PERMISSIONS: Record<'ADMIN' | 'FEE_COLLECTOR', string[]> = {
  ADMIN: CANONICAL_PERMISSIONS.map((p) => p.code),
  FEE_COLLECTOR: [
    'STUDENT_VIEW',
    'FEE_STRUCTURE_VIEW',
    'PAYMENT_COLLECT',
    'RECEIPT_PRINT',
    'REPORTS_VIEW_DAILY',
  ],
};

export function resolveApplicationRole(dbRoles: string[]): 'ADMIN' | 'FEE_COLLECTOR' {
  const normalized = (dbRoles || []).map((r) => String(r).trim().toUpperCase());
  if (normalized.includes('ADMINISTRATOR') || normalized.includes('ADMIN')) {
    return 'ADMIN';
  }
  return 'FEE_COLLECTOR';
}

export interface AuthenticatedStaff {
  id: string;
  username: string;
  fullName: string;
  roles: RoleCode[];
  appRole: 'ADMIN' | 'FEE_COLLECTOR';
  permissions: Set<string>;
  sessionId: string;
  csrfToken: string;
}

declare global {
  namespace Express {
    interface Request {
      staff?: AuthenticatedStaff;
    }
  }
}

export function createAuthMiddleware(prisma: PrismaClient) {
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawToken =
        req.cookies?.['svss_session'] ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : undefined);

      if (!rawToken) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in with your staff account.',
        });
        return;
      }

      const tokenHash = hashSessionToken(rawToken);
      const session = await prisma.userSession.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: {
              userRoles: {
                include: { role: true },
              },
            },
          },
        },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        res.status(401).json({
          error: 'SESSION_EXPIRED',
          message: 'Your session has expired or been logged out. Please sign in again.',
        });
        return;
      }

      if (!session.user.isActive) {
        res.status(403).json({
          error: 'ACCOUNT_DEACTIVATED',
          message: 'This staff account has been deactivated by the school administrator.',
        });
        return;
      }

      const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
      if (!safeMethods.has(req.method)) {
        const providedCsrf = req.headers['x-csrf-token'] as string | undefined;
        if (!verifyCsrfToken(session.csrfToken, providedCsrf)) {
          res.status(403).json({
            error: 'CSRF_TOKEN_INVALID',
            message: 'Invalid or missing CSRF security token.',
          });
          return;
        }
      }

      const roles = session.user.userRoles.map((ur) => ur.role.code);
      const appRole = resolveApplicationRole(roles);
      const permissions = new Set<string>(TWO_ROLE_PERMISSIONS[appRole]);

      req.staff = {
        id: session.user.id,
        username: session.user.username,
        fullName: session.user.fullName,
        roles,
        appRole,
        permissions,
        sessionId: session.id,
        csrfToken: session.csrfToken,
      };

      next();
    } catch (error) {
      next(error);
    }
  };

  const requirePermission = (...requiredPerms: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.staff) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
        return;
      }
      const missing = requiredPerms.filter((p) => !req.staff!.permissions.has(p));
      if (missing.length > 0) {
        res.status(403).json({
          error: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
          message: `अनुमति नहीं है (Access Denied). Role "${req.staff.appRole === 'ADMIN' ? 'Admin' : 'Fee Collector'}" is not permitted to perform: ${missing.join(', ')}.`,
        });
        return;
      }
      next();
    };
  };

  return { requireAuth, requirePermission };
}
