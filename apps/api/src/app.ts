/**
 * Express Application Factory
 * Wires security headers (Helmet), restricted CORS, cookie parser, rate limiting,
 * and versioned REST routes under /api/v1.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAcademicsRouter } from './modules/academics/academics.routes.js';
import { createStudentsRouter } from './modules/students/students.routes.js';
import { createFeesRouter } from './modules/fees/fees.routes.js';
import { createPaymentsRouter } from './modules/payments/payments.routes.js';
import { createReceiptsRouter } from './receipts/receipt-generator.js';
import { createRefundsReversalsRouter } from './modules/refunds-reversals/refunds-reversals.routes.js';
import { createReportsRouter } from './reports/reports.routes.js';
import { createExportsRouter } from './exports/excel-exporter.js';
import { createSettingsRouter } from './modules/settings/settings.routes.js';
import { createHealthRouter } from './modules/health/health.routes.js';

export function createApp(prisma: PrismaClient) {
  const app = express();

  app.set('trust proxy', 1);

  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'https://schoolfeemanagementsystem-9ww6umd0a-abhisheks-projects-f87b48dd.vercel.app',
    'https://*.vercel.app',
  ];

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
    : [];

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/+$/, '');
        const isAllowed = allowedOrigins.some((pattern) => {
          if (pattern === '*' || pattern === normalized) return true;
          if (pattern.includes('*')) {
            const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
            return new RegExp(`^${escaped}$`).test(normalized);
          }
          return false;
        });

        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not permitted by school CORS policy.`));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication requests from this IP. Please wait 15 minutes.',
    },
  });

  // Mount Versioned REST API Routes (/api/v1)
  app.use('/api/v1/health', createHealthRouter(prisma));
  app.use('/api/v1/auth', authRateLimiter, createAuthRouter(prisma));
  app.use('/api/v1', createAcademicsRouter(prisma));
  app.use('/api/v1/academics', createAcademicsRouter(prisma));
  app.use('/api/v1/students', createStudentsRouter(prisma));
  app.use('/api/v1', createFeesRouter(prisma));
  app.use('/api/v1/payments', createPaymentsRouter(prisma));
  app.use('/api/v1', createReceiptsRouter(prisma));
  app.use('/api/v1', createRefundsReversalsRouter(prisma));
  app.use('/api/v1/reports', createReportsRouter(prisma));
  app.use('/api/v1/exports', createExportsRouter(prisma));
  app.use('/api/v1/settings', createSettingsRouter(prisma));

  // Serve built React frontend in local production deployment
  if (process.env.NODE_ENV === 'production') {
    const webDistPath = path.resolve(process.cwd(), '../web/dist');
    app.use(express.static(webDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  // Centralized Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request input.',
        details: err.errors,
      });
      return;
    }
    const status = err.status || 400;
    res.status(status).json({
      error: err.code || 'OPERATION_FAILED',
      message: err.message || 'An unexpected error occurred while processing the request.',
    });
  });

  return app;
}
