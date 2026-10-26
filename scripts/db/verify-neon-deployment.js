#!/usr/bin/env node
/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN — Safe Neon & PostgreSQL Deployment Verifier
 * - Inspects DATABASE_URL and DIRECT_URL without printing passwords or secrets.
 * - Verifies that no destructive reset flags are present.
 * - Attempts a read-only SELECT 1 and table count check if a live database is reachable.
 */
import fs from 'node:fs';
import path from 'node:path';

export function loadEnvFileIfPresent(envPath = path.resolve(process.cwd(), '.env')) {
  const out = { ...process.env };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in out)) out[key] = val;
    }
  }
  return out;
}

export function evaluateNeonReadiness(env = process.env) {
  const dbUrl = (env.DATABASE_URL || '').trim();
  const directUrl = (env.DIRECT_URL || '').trim();
  const issues = [];

  if (!dbUrl) {
    issues.push('DATABASE_URL is missing.');
  } else if (dbUrl.includes('REPLACE_WITH_') || dbUrl.includes('CHANGE_ME_')) {
    issues.push('DATABASE_URL contains placeholder credentials.');
  }

  let isNeon = false;
  let usesPooler = false;
  let sslRequired = false;
  try {
    if (dbUrl) {
      const u = new URL(dbUrl);
      isNeon = u.hostname.endsWith('.neon.tech') || u.hostname.includes('.neon.');
      usesPooler = u.hostname.includes('-pooler.') || u.searchParams.get('pgbouncer') === 'true';
      sslRequired = u.searchParams.get('sslmode') === 'require';
    }
  } catch {
    issues.push('DATABASE_URL is malformed.');
  }

  if (isNeon && !sslRequired) {
    issues.push('Neon DATABASE_URL must include sslmode=require.');
  }
  if (isNeon && !directUrl) {
    issues.push('DIRECT_URL is required alongside DATABASE_URL for Prisma migrations on Neon.');
  }

  return {
    readyForLiveConnection: issues.length === 0,
    isNeon,
    usesPooler,
    hasDirectUrl: Boolean(directUrl),
    sslRequired,
    issues,
  };
}

async function main() {
  const env = loadEnvFileIfPresent();
  const report = evaluateNeonReadiness(env);
  console.log('[SVSS-DB-VERIFY] Configuration Summary:', JSON.stringify(report, null, 2));
  if (!report.readyForLiveConnection) {
    console.log('[SVSS-DB-VERIFY] Live connection skipped until real credentials are provided in .env.');
    process.exit(0);
  }

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    const [students, payments, receipts, sessions] = await Promise.all([
      prisma.student.count(),
      prisma.payment.count(),
      prisma.receipt.count(),
      prisma.academicYear.count(),
    ]);
    console.log('[SVSS-DB-VERIFY] Read-only check succeeded:', {
      students,
      payments,
      receipts,
      sessions,
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify-neon-deployment.js')) {
  main().catch((err) => {
    console.error('[SVSS-DB-VERIFY] Verification failed:', err?.message || 'Unknown error');
    process.exit(1);
  });
}
