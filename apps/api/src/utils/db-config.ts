/**
 * Safe PostgreSQL & Neon Hosted Database Configuration Inspector
 * Validates DATABASE_URL and DIRECT_URL without ever logging or returning credentials,
 * passwords, or raw connection strings.
 */

export interface SafeDatabaseConfigSummary {
  configured: boolean;
  providerMode: 'NEON_HOSTED' | 'LOCAL_POSTGRESQL' | 'REMOTE_POSTGRESQL' | 'UNCONFIGURED';
  usesConnectionPooler: boolean;
  hasDirectUrl: boolean;
  sslRequired: boolean;
  hostRedacted: string;
  databaseName: string;
  warnings: string[];
}

export function redactConnectionString(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return 'UNCONFIGURED';
  try {
    const parsed = new URL(rawUrl.trim());
    const maskedUser = parsed.username ? `${parsed.username.slice(0, 2)}***` : 'user';
    return `${parsed.protocol}//${maskedUser}:***@${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname}`;
  } catch {
    return 'INVALID_URL_FORMAT';
  }
}

export function inspectDatabaseConfiguration(env: Record<string, string | undefined> = process.env): SafeDatabaseConfigSummary {
  const rawDbUrl = (env.DATABASE_URL || '').trim();
  const rawDirectUrl = (env.DIRECT_URL || '').trim();
  const warnings: string[] = [];

  if (!rawDbUrl) {
    return {
      configured: false,
      providerMode: 'UNCONFIGURED',
      usesConnectionPooler: false,
      hasDirectUrl: false,
      sslRequired: false,
      hostRedacted: 'none',
      databaseName: 'none',
      warnings: ['DATABASE_URL is not set in environment variables.'],
    };
  }

  if (rawDbUrl.includes('REPLACE_WITH_') || rawDbUrl.includes('CHANGE_ME_')) {
    warnings.push('DATABASE_URL still contains placeholder credentials from .env.example.');
  }

  let hostname = 'unknown';
  let databaseName = 'unknown';
  let searchParams = new URLSearchParams();

  try {
    const parsed = new URL(rawDbUrl);
    hostname = parsed.hostname.toLowerCase();
    databaseName = parsed.pathname.replace(/^\//, '') || 'postgres';
    searchParams = parsed.searchParams;
  } catch {
    return {
      configured: false,
      providerMode: 'UNCONFIGURED',
      usesConnectionPooler: false,
      hasDirectUrl: Boolean(rawDirectUrl),
      sslRequired: false,
      hostRedacted: 'invalid-url',
      databaseName: 'invalid',
      warnings: ['DATABASE_URL is not a valid PostgreSQL URI.'],
    };
  }

  const isNeon = hostname.endsWith('.neon.tech') || hostname.includes('.neon.');
  const isLocal = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
  const providerMode = isNeon ? 'NEON_HOSTED' : isLocal ? 'LOCAL_POSTGRESQL' : 'REMOTE_POSTGRESQL';
  const usesConnectionPooler = hostname.includes('-pooler.') || searchParams.get('pgbouncer') === 'true';
  const sslMode = (searchParams.get('sslmode') || '').toLowerCase();
  const sslRequired = sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'verify-ca';

  if (isNeon && !sslRequired) {
    warnings.push('Neon connections should specify sslmode=require in DATABASE_URL.');
  }
  if (isNeon && !rawDirectUrl) {
    warnings.push('DIRECT_URL should be configured alongside DATABASE_URL for safe Prisma migrations on Neon.');
  }

  return {
    configured: warnings.length === 0 || !rawDbUrl.includes('REPLACE_WITH_'),
    providerMode,
    usesConnectionPooler,
    hasDirectUrl: Boolean(rawDirectUrl),
    sslRequired,
    hostRedacted: hostname,
    databaseName,
    warnings,
  };
}

export function assertSafeMigrationCommand(commandArgs: string[], env: Record<string, string | undefined> = process.env): void {
  const joined = commandArgs.join(' ').toLowerCase();
  if (
    joined.includes('migrate reset') ||
    joined.includes('db push --force-reset') ||
    joined.includes('db execute') && joined.includes('truncate')
  ) {
    throw new Error(
      'DESTRUCTIVE_MIGRATION_BLOCKED: Destructive schema resets (prisma migrate reset / --force-reset / TRUNCATE) are strictly prohibited to protect school financial records.'
    );
  }
  if (env.NODE_ENV === 'production' && joined.includes('migrate dev')) {
    throw new Error(
      'UNSAFE_PROD_MIGRATION_BLOCKED: Use "npx prisma migrate deploy" in production instead of "prisma migrate dev".'
    );
  }
}
