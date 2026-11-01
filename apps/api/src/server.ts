/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN (स्वामी विवेकानन्द शिक्षण संस्थान)
 * Production API Server Entrypoint
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';

// Use DIRECT_URL fallback if pooler URL encounters connection latency on local development
const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    console.log('[SVSS-API] Connecting to PostgreSQL Database...');
    try {
      await prisma.$connect();
    } catch (poolerErr) {
      if (process.env.DIRECT_URL && process.env.DIRECT_URL !== dbUrl) {
        console.warn('[SVSS-API] Pooler connection failed, falling back to direct connection...');
        const directPrisma = new PrismaClient({
          datasources: { db: { url: process.env.DIRECT_URL } },
        });
        await directPrisma.$connect();
        return startServer(directPrisma);
      }
      throw poolerErr;
    }
    await startServer(prisma);
  } catch (err: any) {
    console.error('[FATAL SERVER ERROR]', err.message);
    process.exit(1);
  }
}

async function startServer(client: PrismaClient) {
  console.log('[SVSS-API] Database connected successfully.');
  const app = createApp(client);

  app.listen(PORT, HOST, () => {
    console.log('====================================================================');
    console.log('SWAMI VIVEKANAND SIKSHAN SANSTHAN — SCHOOL FEE MANAGEMENT SYSTEM');
    console.log(`Server URL : http://localhost:${PORT}`);
    console.log(`Timezone   : ${process.env.APP_TIMEZONE || 'Asia/Kolkata'}`);
    console.log('====================================================================');
  });
}

bootstrap();
