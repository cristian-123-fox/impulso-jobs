import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { uploadsDir } from './common/storage/uploads-dir';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');

  // Imágenes subidas (foto de perfil, logo): estáticas bajo /uploads, fuera
  // del prefijo /api/v1. Solo se expone el subárbol `public/` — los CV viven
  // en uploads/candidate-resumes y bajan por endpoint autenticado.
  // maxAge agresivo porque cada subida genera un nombre de archivo nuevo.
  app.useStaticAssets(join(uploadsDir(), 'public'), {
    prefix: '/uploads/',
    index: false,
    dotfiles: 'ignore',
    immutable: true,
    maxAge: '30d',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  // Detrás de Apache/Passenger (cPanel): confía en el proxy para obtener la IP
  // real del cliente (usada en la auditoría).
  app.set('trust proxy', 1);

  // CORS: en producción se restringe a los orígenes de CORS_ORIGIN
  // (coma-separado, p. ej. "https://tudominio.com"). Sin la variable, permisivo.
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : true,
    credentials: true,
    // Sin esto el navegador no puede leer el nombre del archivo en las
    // descargas de CV (el frontend caería al nombre genérico).
    exposedHeaders: ['Content-Disposition'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Impulso Jobs API')
    .setDescription('API del portal de empleabilidad Impulso Jobs.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
