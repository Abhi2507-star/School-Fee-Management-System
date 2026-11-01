/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN (स्वामी विवेकानन्द शिक्षण संस्थान)
 * Production API Server Entrypoint
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';

const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    console.log('[SVSS-API] Connecting to PostgreSQL Database...');
    await prisma.$connect();
    console.log('[SVSS-API] Database connected successfully.');

    const app = createApp(prisma);

    app.listen(PORT, HOST, () => {
      console.log('====================================================================');
      console.log('SWAMI VIVEKANAND SIKSHAN SANSTHAN — SCHOOL FEE MANAGEMENT SYSTEM');
      console.log(`Server URL : http://localhost:${PORT}`);
      console.log(`Timezone   : ${process.env.APP_TIMEZONE || 'Asia/Kolkata'}`);
      console.log('====================================================================');
    });
  } catch (err: any) {
    console.error('[FATAL SERVER ERROR]', err.message);
    process.exit(1);
  }
}

bootstrap();
