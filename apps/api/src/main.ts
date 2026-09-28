// ============================================================
// Path: apps/api/src/main.ts
// ============================================================

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  const port = config.get<number>('PORT', 4000);
  const apiPrefix = config.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  app.setGlobalPrefix(apiPrefix);
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Serve uploaded files (avatars) at /uploads/*
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Study Buddy API')
    .setDescription('শিক্ষার্থীদের পড়াশোনার সঙ্গী - Backend API')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
  Logger.log(`🐱 Study Buddy API running on http://0.0.0.0:${port}/${apiPrefix}`, 'Bootstrap');
  Logger.log(`📚 Swagger docs at http://0.0.0.0:${port}/api/docs`, 'Bootstrap');
  Logger.log(`🖼️  Static uploads at http://0.0.0.0:${port}/uploads/`, 'Bootstrap');
}

bootstrap();