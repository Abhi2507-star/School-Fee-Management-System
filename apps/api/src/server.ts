/**
 * Server Entrypoint (Supports Neon Hosted PostgreSQL & Local PostgreSQL)
 * Verifies PostgreSQL availability before binding HTTP server.
 * Never logs raw connection strings or credentials, and never falls back to mock data.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { inspectDatabaseConfiguration, redactConnectionString } from './utils/db-config.js';

const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  const dbSummary = inspectDatabaseConfiguration(process.env);
  try {
    console.log(
      `[SVSS-SFMS] Verifying PostgreSQL connection (${dbSummary.providerMode}, target: ${redactConnectionString(process.env.DATABASE_URL)})...`
    );
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('[SVSS-SFMS] PostgreSQL database connected and verified.');

    const app = createApp(prisma);
    app.listen(PORT, HOST, () => {
      console.log('====================================================================');
      console.log('SWAMI VIVEKANAND SIKSHAN SANSTHAN — SCHOOL FEE MANAGEMENT SYSTEM');
      console.log(`Server URL            : http://localhost:${PORT}`);
      console.log(`Database Provider     : ${dbSummary.providerMode} (Pooler: ${dbSummary.usesConnectionPooler})`);
      console.log(`Timezone              : ${process.env.APP_TIMEZONE || 'Asia/Kolkata'}`);
      console.log('====================================================================');
    });
  } catch (error: any) {
    console.error('====================================================================');
    console.error('[FATAL STARTUP ERROR] Could not connect to configured PostgreSQL database.');
    console.error('The application refuses to start with an empty or mock fallback database.');
    console.error('Target (redacted):', redactConnectionString(process.env.DATABASE_URL));
    console.error('Reason:', error?.message || 'Connection failed');
    console.error('====================================================================');
    process.exit(1);
  }
}

bootstrap();
