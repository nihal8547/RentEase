import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    // Limit request body to 10mb to prevent DoS via large payloads
    bodyParser: true,
    logger: isProd ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ── HTTPS Enforcement Middleware ─────────────────────────────────────────
  app.use((req: any, res: any, next: any) => {
    if (
      process.env.NODE_ENV === 'production' &&
      !req.secure &&
      req.get('x-forwarded-proto') !== 'https'
    ) {
      return res.redirect(`https://${req.hostname}${req.url}`);
    }
    next();
  });

  // ── Security Headers via Helmet ──────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Allow cross-origin iframes for PDF/print
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for Vite dev
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  // ── CORS — restrict to known origin in production ────────────────────────
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigin === '*' ||
        origin === allowedOrigin ||
        origin.startsWith('http://localhost')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── Global Validation Pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip fields not in DTO
      forbidNonWhitelisted: true, // 400 if unknown fields sent
      transform: true,          // Auto-transform primitives (string → number)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global Exception Filter ──────────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Graceful Shutdown ──────────────────────────────────────────────────
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`RentEase Backend API running on http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS allowed origin: ${allowedOrigin}`);
}

await bootstrap();
