/**
 * Immutable Audit Trail Service
 * Ensures all sensitive administrative and financial events are recorded without
 * ever leaking passwords, session tokens, or card numbers.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { sanitizeForAuditAndResponse } from '../security/password.js';

export interface AuditEventInput {
  actorUserId?: string | null;
  actorUsername: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function recordAuditLog(
  db: PrismaClient | Prisma.TransactionClient,
  event: AuditEventInput
): Promise<void> {
  const safeMetadata = event.metadata ? sanitizeForAuditAndResponse(event.metadata) : undefined;
  await db.auditLog.create({
    data: {
      actorUserId: event.actorUserId ?? null,
      actorUsername: event.actorUsername,
      actorRole: event.actorRole,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      summary: event.summary,
      metadataJson: safeMetadata ? JSON.stringify(safeMetadata) : null,
      ipAddress: event.ipAddress ?? null,
    },
  });
}
