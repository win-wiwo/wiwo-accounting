import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  mkdirSync(join(process.cwd(), 'uploads', 'attachments'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'item-photos'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'user-photos'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'signatures'), { recursive: true });
  mkdirSync(join(process.cwd(), 'uploads', 'po-proofs'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const configuredCorsOrigin = configService.get<string>('CORS_ORIGIN');
  const baseOrigins = configuredCorsOrigin
    ? configuredCorsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const allowedOrigins = Array.from(
    new Set(
      baseOrigins.flatMap((origin) => {
        if (origin === 'http://localhost:5173') {
          return [origin, 'http://127.0.0.1:5173'];
        }
        if (origin === 'http://127.0.0.1:5173') {
          return [origin, 'http://localhost:5173'];
        }
        return [origin];
      }),
    ),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PRAMS API')
    .setDescription('Purchase Request and Approval Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`PRAMS API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
